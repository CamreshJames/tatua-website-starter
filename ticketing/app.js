// Encryption key for AES
const CIPHER_KEY = 'tatua_super_secret_key_for_aes_2025!';

// --- Encryption Functions ---

/**
 * Encrypts a string using AES encryption.
 * @param {string} text - The plain text to encrypt.
 * @returns {string} The encrypted ciphertext string.
 */
function encryptAES(text) {
    try {
        return CryptoJS.AES.encrypt(text, CIPHER_KEY).toString();
    } catch (e) {
        console.error("AES Encryption failed:", e);
        return text; // Return unencrypted text as fallback
    }
}

/**
 * Decrypts an AES-encrypted string.
 * @param {string} ciphertext - The encrypted ciphertext.
 * @returns {string} The decrypted plain text.
 */
function decryptAES(ciphertext) {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, CIPHER_KEY);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedText) {
            throw new Error("Decryption resulted in empty string.");
        }
        return decryptedText;
    } catch (e) {
        console.error("AES Decryption failed:", e);
        return ciphertext; // Return raw data as fallback
    }
}

// --- Storage Strategy Classes ---

/**
 * Abstract base class for storage strategies.
 */
class StorageStrategy {
    getTickets() { throw new Error("getTickets() must be implemented"); }
    saveTicket(ticket) { throw new Error("saveTicket() must be implemented"); }
    getTicket(ticketId) { throw new Error("getTicket() must be implemented"); }
    deleteTicket(ticketId) { throw new Error("deleteTicket() must be implemented"); }
    updateTicket(ticketId, data) { throw new Error("updateTicket() must be implemented"); }
}

/**
 * In-memory storage strategy.
 */
class MemoryStorage extends StorageStrategy {
    constructor() {
        super();
        this.tickets = [];
    }

    getTickets() { return [...this.tickets]; }
    saveTicket(ticket) { this.tickets.unshift(ticket); }
    getTicket(ticketId) { return this.tickets.find(t => t.id === ticketId); }
    deleteTicket(ticketId) { this.tickets = this.tickets.filter(t => t.id !== ticketId); }
    updateTicket(ticketId, updatedData) {
        const index = this.tickets.findIndex(t => t.id === ticketId);
        if (index !== -1) {
            this.tickets[index] = { ...this.tickets[index], ...updatedData };
        }
    }
}

/**
 * Persistent storage base class for session and local storage.
 */
class PersistentStorage extends StorageStrategy {
    constructor(storage, key) {
        super();
        this.storage = storage;
        this.storageKey = key;
    }

    getTickets() {
        const stored = this.storage.getItem(this.storageKey);
        if (!stored) return [];
        try {
            return JSON.parse(decryptAES(stored));
        } catch (e) {
            console.error('Failed to parse tickets:', e);
            return [];
        }
    }

    saveToStorage(tickets) {
        this.storage.setItem(this.storageKey, encryptAES(JSON.stringify(tickets)));
    }

    saveTicket(ticket) {
        const tickets = this.getTickets();
        tickets.unshift(ticket);
        this.saveToStorage(tickets);
    }

    getTicket(ticketId) {
        return this.getTickets().find(t => t.id === ticketId);
    }

    deleteTicket(ticketId) {
        const tickets = this.getTickets().filter(t => t.id !== ticketId);
        this.saveToStorage(tickets);
    }

    updateTicket(ticketId, updatedData) {
        const tickets = this.getTickets();
        const index = tickets.findIndex(t => t.id === ticketId);
        if (index !== -1) {
            tickets[index] = { ...tickets[index], ...updatedData };
            this.saveToStorage(tickets);
        }
    }
}

/**
 * Session storage strategy.
 */
class SessionStorage extends PersistentStorage {
    constructor() {
        super(sessionStorage, 'tatua_tickets_session_aes');
    }
}

/**
 * Local storage strategy.
 */
class LocalStorage extends PersistentStorage {
    constructor() {
        super(localStorage, 'tatua_tickets_local_aes');
    }
}

// --- Main Application Class ---

/**
 * Main application class for the Tatua Ticketing System.
 * Manages state, UI, event listeners, and storage strategies.
 */
class TatuaTicketingSystem {
    constructor() {
        // Storage strategies
        this.storageStrategies = {
            memory: new MemoryStorage(),
            session: new SessionStorage(),
            local: new LocalStorage()
        };

        // Initialize state
        this.currentStorage = this.getStorageFromURL() || 'memory';
        this.currentFilters = [];
        this.currentSorters = [{ column: 'dateCreated', order: 'desc' }];
        this.currentAttachmentData = null;
        this.currentEditAttachmentData = null;
        this.editingTicketId = null;

        this.init();
    }

    // --- Initialization ---

    /**
     * Initializes the application by setting up event listeners and loading tickets.
     */
    init() {
        this.setupEventListeners();
        this.loadTickets();
        this.updateUI();
    }

    /**
     * Reads the 'storage' query parameter from the URL.
     * @returns {string|null} The storage type or null if invalid.
     */
    getStorageFromURL() {
        const params = new URLSearchParams(window.location.search);
        const storage = params.get('storage');
        return ['memory', 'session', 'local'].includes(storage) ? storage : null;
    }

    // --- Event Listeners ---

    /**
     * Sets up all event listeners for the application.
     */
    setupEventListeners() {
        // Storage type change
        document.getElementById('storageType').addEventListener('change', (e) => {
            this.switchStorage(e.target.value);
        });

        // New ticket form submission
        document.getElementById('ticketForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Edit ticket form submission
        document.getElementById('editTicketForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEditedTicket();
        });

        // Save changes button in edit modal
        document.getElementById('saveChangesBtn').addEventListener('click', () => {
            this.saveEditedTicket();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadTickets();
            this.showToast('Tickets refreshed successfully');
        });

        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchScreen(e.target.getAttribute('data-screen'));
            });
        });

        // Form validation listeners
        this.setupFormValidationListeners('ticketForm');
        this.setupFormValidationListeners('editTicketForm');

        // File input listeners
        this.setupFileInputListeners('attachment', (data) => {
            this.currentAttachmentData = data;
        });
        this.setupFileInputListeners('editAttachment', (data) => {
            this.currentEditAttachmentData = data;
        });

        // Modal control listeners
        document.getElementById('sortBtn').addEventListener('click', () => {
            this.openSortModal();
        });
        document.getElementById('filterBtn').addEventListener('click', () => {
            this.openFilterModal();
        });

        document.querySelectorAll('.close-modal, .modal-cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.hideModal(e.target.closest('.modal').id);
            });
        });

        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                this.hideModal(event.target.id);
            }
        });

        // Sort and filter button listeners
        document.getElementById('addSorterBtn').addEventListener('click', () => {
            this.addSorterRow();
        });
        document.getElementById('resetSorterBtn').addEventListener('click', () => {
            this.resetSorters();
        });
        document.getElementById('submitSorterBtn').addEventListener('click', () => {
            this.applySorters();
        });
        document.getElementById('addFilterBtn').addEventListener('click', () => {
            this.addFilterRow();
        });
        document.getElementById('resetFilterBtn').addEventListener('click', () => {
            this.resetFilters();
        });
        document.getElementById('submitFilterBtn').addEventListener('click', () => {
            this.applyFilters();
        });
    }

    /**
     * Sets up listeners for a file input element.
     * @param {string} inputId - The ID of the file input element.
     * @param {function} onFileLoad - Callback function when a file is successfully read.
     */
    setupFileInputListeners(inputId, onFileLoad) {
        const fileInput = document.getElementById(inputId);
        if (!fileInput) return;

        const form = fileInput.closest('form');
        const fileButton = form.querySelector('.file-button');
        const fileText = form.querySelector('.file-text');
        const filePreview = form.querySelector('.file-preview-container');
        const fileErrorElement = form.querySelector('.error-message[id^="attachmentError"]');

        fileButton.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            fileErrorElement.textContent = '';
            filePreview.innerHTML = '';
            onFileLoad(null);

            if (file) {
                if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
                    fileErrorElement.textContent = 'Invalid file type. Please use PDF, JPG, or PNG.';
                    fileInput.value = '';
                    return;
                }
                if (file.size > 1 * 1024 * 1024) {
                    fileErrorElement.textContent = 'File size cannot exceed 1MB.';
                    fileInput.value = '';
                    return;
                }

                fileText.textContent = file.name;
                const reader = new FileReader();
                reader.onload = (event) => {
                    const fileData = { type: file.type, data: event.target.result };
                    onFileLoad(fileData);
                    if (file.type.startsWith('image/')) {
                        filePreview.innerHTML = `<img src="${event.target.result}" alt="File preview">`;
                    } else if (file.type === 'application/pdf') {
                        filePreview.innerHTML = `<div class="pdf-icon" title="${file.name}">PDF</div>`;
                    }
                };
                reader.readAsDataURL(file);
            } else {
                fileText.textContent = 'No file chosen';
            }
        });
    }

    /**
     * Sets up real-time validation listeners for a form.
     * @param {string} formId - The ID of the form to attach listeners to.
     */
    setupFormValidationListeners(formId) {
        const form = document.getElementById(formId);
        form.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('blur', (e) => this.validateField(e.target));
            input.addEventListener('input', (e) => this.validateField(e.target));
        });
    }

    /**
     * Validates a single form field and updates its UI.
     * @param {HTMLElement} field - The form field element to validate.
     * @returns {boolean} True if the field is valid, false otherwise.
     */
    validateField(field) {
        const fieldName = field.name || field.id;
        let isValid = true;
        this.clearFieldError(fieldName);

        switch (fieldName) {
            case 'fullName':
            case 'editFullName':
                if (!field.value.trim()) {
                    this.showFieldError(fieldName, 'Full name is required');
                    isValid = false;
                } else if (field.value.trim().length < 2) {
                    this.showFieldError(fieldName, 'Must be at least 2 characters');
                    isValid = false;
                }
                break;
            case 'email':
            case 'editEmail':
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!field.value.trim()) {
                    this.showFieldError(fieldName, 'Email is required');
                    isValid = false;
                } else if (!emailPattern.test(field.value.trim())) {
                    this.showFieldError(fieldName, 'Please enter a valid email');
                    isValid = false;
                }
                break;
            case 'phone':
            case 'editPhone':
                const phonePattern = /^(?:0[17]\d{8}|(?:\+|00)[1-9]\d{6,14})$/;
                if (!field.value.trim()) {
                    this.showFieldError(fieldName, 'Phone number is required');
                    isValid = false;
                } else if (!phonePattern.test(field.value.replace(/[\s\-\(\)]/g, ''))) {
                    this.showFieldError(fieldName, 'Enter a valid Kenyan (07/01) or intl number');
                    isValid = false;
                }
                break;
            case 'subject':
            case 'editSubject':
                if (!field.value) {
                    this.showFieldError(fieldName, 'Please select a subject');
                    isValid = false;
                }
                break;
            case 'message':
            case 'editMessage':
                if (!field.value.trim()) {
                    this.showFieldError(fieldName, 'Message is required');
                    isValid = false;
                } else if (field.value.trim().length < 10) {
                    this.showFieldError(fieldName, 'Message must be at least 10 characters');
                    isValid = false;
                }
                break;
            case 'terms':
                if (!field.checked) {
                    this.showFieldError(fieldName, 'You must agree to the terms');
                    isValid = false;
                }
                break;
            case 'contact':
            case 'editContact':
                const form = field.closest('form');
                if (!form.querySelector(`input[name="${fieldName}"]:checked`)) {
                    this.showFieldError(fieldName, 'Please select a contact method');
                    isValid = false;
                }
                break;
        }
        return isValid;
    }

    /**
     * Shows an error message for a form field.
     * @param {string} fieldName - The name or ID of the field.
     * @param {string} message - The error message to display.
     */
    showFieldError(fieldName, message) {
        const field = document.getElementById(fieldName) || document.querySelector(`[name=${fieldName}]`);
        if (!field) return;
        const formGroup = field.closest('.form-group');
        const inputContainer = field.closest('.input-container') || formGroup.querySelector('.input-container');
        const errorElement = document.getElementById(fieldName + 'Error');
        if (formGroup) formGroup.classList.add('error');
        if (inputContainer) inputContainer.classList.add('error');
        if (errorElement) errorElement.textContent = message;
    }

    /**
     * Clears an error message for a form field.
     * @param {string} fieldName - The name or ID of the field.
     */
    clearFieldError(fieldName) {
        const field = document.getElementById(fieldName) || document.querySelector(`[name=${fieldName}]`);
        if (!field) return;
        const formGroup = field.closest('.form-group');
        const inputContainer = field.closest('.input-container') || formGroup.querySelector('.input-container');
        const errorElement = document.getElementById(fieldName + 'Error');
        if (formGroup) formGroup.classList.remove('error');
        if (inputContainer) inputContainer.classList.remove('error');
        if (errorElement) errorElement.textContent = '';
    }

    // --- Screen and Storage Management ---

    /**
     * Switches between different screens in the UI.
     * @param {string} screenName - The name of the screen to switch to.
     */
    switchScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenName + 'Screen').classList.add('active');

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-screen') === screenName) {
                link.classList.add('active');
            }
        });

        if (screenName === 'ticketsList') {
            this.loadTickets();
        }
    }

    /**
     * Switches the storage type and updates the UI.
     * @param {string} newType - The new storage type ('memory', 'session', 'local').
     */
    switchStorage(newType) {
        if (this.currentStorage === newType) return;
        this.currentStorage = newType;
        this.updateURLStorage(newType);
        this.loadTickets();
        this.showToast(`Switched to ${newType} storage`);
        this.updateUI();
    }

    /**
     * Updates the URL with the current storage type.
     * @param {string} storageType - The storage type to set in the URL.
     */
    updateURLStorage(storageType) {
        const url = new URL(window.location);
        url.searchParams.set('storage', storageType);
        window.history.pushState({}, '', url);
    }

    // --- Form Handling ---

    /**
     * Handles submission of the new ticket form.
     */
    handleFormSubmit() {
        if (this.validateForm('ticketForm')) {
            const form = document.getElementById('ticketForm');
            const formData = new FormData(form);
            const ticketData = {
                fullName: formData.get('fullName').trim(),
                email: formData.get('email').trim(),
                phone: formData.get('phone').trim(),
                subject: formData.get('subject'),
                message: formData.get('message').trim(),
                contact: formData.get('contact'),
                attachmentName: form.querySelector('#attachment').files[0]?.name || null,
                attachmentData: this.currentAttachmentData
            };
            const ticket = this.createTicket(ticketData);
            this.storageStrategies[this.currentStorage].saveTicket(ticket);
            this.loadTickets();
            this.resetForm('ticketForm');
            this.showToast('Ticket submitted successfully!');
            this.switchScreen('ticketsList');
        }
    }

    /**
     * Validates all fields in a form.
     * @param {string} formId - The ID of the form to validate.
     * @returns {boolean} True if the form is valid, false otherwise.
     */
    validateForm(formId) {
        let isValid = true;
        const form = document.getElementById(formId);
        form.querySelectorAll('input:not([type=radio]), textarea, select').forEach(field => {
            if (!this.validateField(field)) isValid = false;
        });

        const contactField = form.querySelector('[name="contact"], [name="editContact"]');
        if (contactField && !this.validateField(contactField)) isValid = false;

        const termsField = form.querySelector('[name="terms"]');
        if (termsField && !this.validateField(termsField)) isValid = false;

        return isValid;
    }

    /**
     * Creates a new ticket object from form data.
     * @param {Object} formData - The form data to create a ticket from.
     * @returns {Object} The created ticket object.
     */
    createTicket(formData) {
        return {
            id: `TKT-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
            ...formData,
            dateCreated: new Date().toISOString(),
            status: 'Open'
        };
    }

    /**
     * Resets a form and its associated state.
     * @param {string} formId - The ID of the form to reset.
     */
    resetForm(formId) {
        const form = document.getElementById(formId);
        form.reset();
        form.querySelector('.file-text').textContent = 'No file chosen';
        form.querySelector('.file-preview-container').innerHTML = '';
        this.currentAttachmentData = null;
        this.currentEditAttachmentData = null;
        form.querySelectorAll('.form-group, .input-container').forEach(el => {
            el.classList.remove('error');
        });
        form.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
        });
    }

    // --- Ticket Management ---

    /**
     * Loads and renders tickets with applied filters and sorters.
     */
    loadTickets() {
        let tickets = this.storageStrategies[this.currentStorage].getTickets();

        if (this.currentFilters.length > 0) {
            tickets = tickets.filter(ticket => {
                return this.currentFilters.every(filter => {
                    const ticketValue = (ticket[filter.column] || '').toString().toLowerCase();
                    const filterValue = (filter.value || '').toString().toLowerCase();
                    switch (filter.relation) {
                        case 'equals': return ticketValue === filterValue;
                        case 'contains': return ticketValue.includes(filterValue);
                        case 'startsWith': return ticketValue.startsWith(filterValue);
                        case 'endsWith': return ticketValue.endsWith(filterValue);
                        default: return true;
                    }
                });
            });
        }

        tickets.sort((a, b) => {
            for (const sorter of this.currentSorters) {
                const valA = a[sorter.column];
                const valB = b[sorter.column];
                let comparison = 0;
                if (valA > valB) comparison = 1;
                else if (valA < valB) comparison = -1;
                if (comparison !== 0) {
                    return sorter.order === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });

        this.renderTickets(tickets);
    }

    /**
     * Renders tickets to the table.
     * @param {Array} tickets - The tickets to render.
     */
    renderTickets(tickets) {
        const tbody = document.getElementById('ticketsTableBody');
        const emptyState = document.getElementById('emptyState');
        const table = document.getElementById('ticketsTable');
        table.style.display = tickets.length === 0 ? 'none' : 'table';
        emptyState.style.display = tickets.length === 0 ? 'block' : 'none';
        tbody.innerHTML = tickets.map(ticket => this.renderTicketRow(ticket)).join('');
    }

    /**
     * Renders a single ticket row for the table.
     * @param {Object} ticket - The ticket to render.
     * @returns {string} The HTML for the ticket row.
     */
    renderTicketRow(ticket) {
        const formattedDate = new Date(ticket.dateCreated).toLocaleString();
        return `
            <tr>
                <td class="ticket-id">${this.escapeHtml(ticket.id)}</td>
                <td>
                    <div class="user-name">${this.escapeHtml(ticket.fullName)}</div>
                    <div class="user-email">${this.escapeHtml(ticket.email)}</div>
                </td>
                <td class="ticket-details">
                    <div class="ticket-subject">${this.escapeHtml(ticket.subject)}</div>
                    <div class="ticket-message">${this.escapeHtml(ticket.message)}</div>
                </td>
                <td class="ticket-date">${formattedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" title="View" onclick="app.viewTicket('${ticket.id}')"><svg class="icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" /></svg></button>
                        <a href="mailto:${ticket.email}" class="action-btn ${ticket.contact === 'Email' ? 'active' : ''}" title="Email User"><svg class="icon" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg></a>
                        <a href="tel:${ticket.phone}" class="action-btn ${ticket.contact === 'Phone' ? 'active' : ''}" title="Call User"><svg class="icon" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg></a>
                        <button class="action-btn" title="Reply to Ticket" onclick="app.replyToTicket('${ticket.id}')"><svg class="icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg></button>
                        <button class="action-btn" title="Edit" onclick="app.editTicket('${ticket.id}')"><svg class="icon" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button>
                        <button class="action-btn delete" title="Delete" onclick="app.confirmDelete('${ticket.id}')"><svg class="icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button>
                    </div>
                </td>
            </tr>
        `;
    }

    // --- CRUD Operations ---

    /**
     * Displays ticket details in a modal.
     * @param {string} ticketId - The ID of the ticket to view.
     */
    viewTicket(ticketId) {
        const ticket = this.storageStrategies[this.currentStorage].getTicket(ticketId);
        if (!ticket) return;

        let attachmentPreviewHTML = 'None';
        if (ticket.attachmentData) {
            if (ticket.attachmentData.type.startsWith('image/')) {
                attachmentPreviewHTML = `<img src="${ticket.attachmentData.data}" alt="Attachment preview" class="attachment-preview-img">`;
            } else if (ticket.attachmentData.type === 'application/pdf') {
                attachmentPreviewHTML = `<a href="${ticket.attachmentData.data}" target="_blank" class="pdf-icon-link" title="Open PDF in new tab">PDF</a>`;
            }
        }

        document.getElementById('viewModalTitle').textContent = `Ticket Details`;
        document.getElementById('viewModalBody').innerHTML = `
            <dl class="view-details-list">
                <dt>Ticket ID</dt><dd>${this.escapeHtml(ticket.id)}</dd>
                <dt>Full Name</dt><dd>${this.escapeHtml(ticket.fullName)}</dd>
                <dt>Email</dt><dd>${this.escapeHtml(ticket.email)}</dd>
                <dt>Phone</dt><dd>${this.escapeHtml(ticket.phone)}</dd>
                <dt>Subject</dt><dd>${this.escapeHtml(ticket.subject)}</dd>
                <dt>Message</dt><dd>${this.escapeHtml(ticket.message)}</dd>
                <dt>Preferred Contact</dt><dd>${this.escapeHtml(ticket.contact)}</dd>
                <dt>Date Created</dt><dd>${new Date(ticket.dateCreated).toLocaleString()}</dd>
                <dt>Attachment</dt><dd>${attachmentPreviewHTML}</dd>
            </dl>`;
        document.getElementById('downloadBtn').onclick = () => this.downloadTicket(ticketId);
        this.showModal('viewTicketModal');
    }

    /**
     * Opens the edit modal for a ticket.
     * @param {string} ticketId - The ID of the ticket to edit.
     */
    editTicket(ticketId) {
        const ticket = this.storageStrategies[this.currentStorage].getTicket(ticketId);
        if (!ticket) return;

        this.editingTicketId = ticketId;
        this.currentEditAttachmentData = null;

        const form = document.getElementById('editTicketForm');
        form.querySelector('[name=editFullName]').value = ticket.fullName;
        form.querySelector('[name=editEmail]').value = ticket.email;
        form.querySelector('[name=editPhone]').value = ticket.phone;
        form.querySelector('[name=editSubject]').value = ticket.subject;
        form.querySelector('[name=editMessage]').value = ticket.message;
        form.querySelector(`input[name="editContact"][value="${ticket.contact}"]`).checked = true;

        const fileText = form.querySelector('.file-text');
        const filePreview = form.querySelector('.file-preview-container');
        const fileInput = form.querySelector('#editAttachment');
        fileInput.value = '';

        if (ticket.attachmentData) {
            fileText.textContent = ticket.attachmentName || 'Attachment present';
            if (ticket.attachmentData.type.startsWith('image/')) {
                filePreview.innerHTML = `<img src="${ticket.attachmentData.data}" alt="File preview">`;
            } else if (ticket.attachmentData.type === 'application/pdf') {
                filePreview.innerHTML = `<div class="pdf-icon" title="${ticket.attachmentName}">PDF</div>`;
            }
        } else {
            fileText.textContent = 'No file chosen';
            filePreview.innerHTML = '';
        }

        form.querySelectorAll('.form-group, .input-container').forEach(el => {
            el.classList.remove('error');
        });
        form.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
        });

        this.showModal('editTicketModal');
    }

    /**
     * Saves changes to an edited ticket.
     */
    saveEditedTicket() {
        if (!this.editingTicketId) return;

        if (this.validateForm('editTicketForm')) {
            const form = document.getElementById('editTicketForm');
            const originalTicket = this.storageStrategies[this.currentStorage].getTicket(this.editingTicketId);
            const attachmentFile = form.querySelector('#editAttachment').files[0];

            const updatedData = {
                fullName: form.querySelector('[name=editFullName]').value.trim(),
                email: form.querySelector('[name=editEmail]').value.trim(),
                phone: form.querySelector('[name=editPhone]').value.trim(),
                subject: form.querySelector('[name=editSubject]').value,
                message: form.querySelector('[name=editMessage]').value.trim(),
                contact: form.querySelector('input[name="editContact"]:checked').value,
                attachmentName: this.currentEditAttachmentData ? attachmentFile.name : originalTicket.attachmentName,
                attachmentData: this.currentEditAttachmentData ? this.currentEditAttachmentData : originalTicket.attachmentData,
            };

            this.storageStrategies[this.currentStorage].updateTicket(this.editingTicketId, updatedData);
            this.hideModal('editTicketModal');
            this.loadTickets();
            this.showToast('Ticket updated successfully!');
            this.editingTicketId = null;
            this.currentEditAttachmentData = null;
        }
    }

    /**
     * Shows a confirmation modal for deleting a ticket.
     * @param {string} ticketId - The ID of the ticket to delete.
     */
    confirmDelete(ticketId) {
        this.showModal('confirmModal');
        document.getElementById('confirmOkBtn').onclick = () => {
            this.deleteTicket(ticketId);
            this.hideModal('confirmModal');
        };
    }

    /**
     * Deletes a ticket from storage.
     * @param {string} ticketId - The ID of the ticket to delete.
     */
    deleteTicket(ticketId) {
        this.storageStrategies[this.currentStorage].deleteTicket(ticketId);
        this.loadTickets();
        this.showToast('Ticket deleted successfully');
    }

    /**
     * Downloads ticket details as a text file.
     * @param {string} ticketId - The ID of the ticket to download.
     */
    downloadTicket(ticketId) {
        const ticket = this.storageStrategies[this.currentStorage].getTicket(ticketId);
        if (ticket) {
            const text = Object.entries(ticket)
                .filter(([key]) => key !== 'attachmentData')
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
            const blob = new Blob([text], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `ticket_${ticket.id}.txt`;
            a.click();
            URL.revokeObjectURL(a.href);
        }
    }

    // --- Placeholder Actions ---

    replyToTicket(ticketId) { this.showToast(`Functionality for 'Reply' to be implemented.`); }
    forwardTicket(ticketId) { this.showToast(`Functionality for 'Forward' to be implemented.`); }
    assignTicket(ticketId) { this.showToast(`Functionality for 'Assign' to be implemented.`); }

    // --- UI Helpers ---

    /**
     * Shows a modal by ID.
     * @param {string} id - The ID of the modal to show.
     */
    showModal(id) {
        document.getElementById(id).classList.add('active');
    }

    /**
     * Hides a modal by ID.
     * @param {string} id - The ID of the modal to hide.
     */
    hideModal(id) {
        document.getElementById(id).classList.remove('active');
    }

    /**
     * Shows a toast notification.
     * @param {string} message - The message to display.
     * @param {boolean} isError - Whether the toast is an error message.
     */
    showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${isError ? 'error' : ''}`;
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    /**
     * Escapes HTML characters in a string.
     * @param {string} text - The text to escape.
     * @returns {string} The escaped text.
     */
    escapeHtml(text) {
        return text
            ? text.toString()
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;")
            : "";
    }

    /**
     * Updates the UI to reflect the current state.
     */
    updateUI() {
        document.getElementById('storageType').value = this.currentStorage;
    }

    // --- Sort and Filter Modal Logic ---

    /**
     * Opens the sort modal and renders sorter rows.
     */
    openSortModal() {
        this.renderSorterRows();
        this.showModal('sortModal');
    }

    /**
     * Renders sorter rows in the sort modal.
     */
    renderSorterRows() {
        const container = document.getElementById('sorterRowsContainer');
        container.innerHTML = '';
        if (this.currentSorters.length === 0) {
            this.addSorterRow();
        } else {
            this.currentSorters.forEach(sorter => this.addSorterRow(sorter));
        }
    }

    /**
     * Adds a sorter row to the sort modal.
     * @param {Object} sorter - The sorter configuration.
     */
    addSorterRow(sorter = { column: 'dateCreated', order: 'desc' }) {
        const container = document.getElementById('sorterRowsContainer');
        const row = document.createElement('div');
        row.className = 'modal-dynamic-row';
        row.innerHTML = `
            <select name="sortColumn">
                <option value="id" ${sorter.column === 'id' ? 'selected' : ''}>Ticket ID</option>
                <option value="fullName" ${sorter.column === 'fullName' ? 'selected' : ''}>Full Name</option>
                <option value="email" ${sorter.column === 'email' ? 'selected' : ''}>Email</option>
                <option value="subject" ${sorter.column === 'subject' ? 'selected' : ''}>Subject</option>
                <option value="dateCreated" ${sorter.column === 'dateCreated' ? 'selected' : ''}>Date Created</option>
            </select>
            <select name="sortOrder">
                <option value="asc" ${sorter.order === 'asc' ? 'selected' : ''}>Ascending</option>
                <option value="desc" ${sorter.order === 'desc' ? 'selected' : ''}>Descending</option>
            </select>
            <button class="modal-delete-btn" title="Remove sorter">&times;</button>`;
        row.querySelector('.modal-delete-btn').addEventListener('click', () => row.remove());
        container.appendChild(row);
    }

    /**
     * Resets sorters to default.
     */
    resetSorters() {
        this.currentSorters = [{ column: 'dateCreated', order: 'desc' }];
        this.renderSorterRows();
    }

    /**
     * Applies sorters and refreshes the ticket list.
     */
    applySorters() {
        this.currentSorters = Array.from(document.querySelectorAll('#sorterRowsContainer .modal-dynamic-row')).map(row => ({
            column: row.querySelector('[name=sortColumn]').value,
            order: row.querySelector('[name=sortOrder]').value
        }));
        this.loadTickets();
        this.hideModal('sortModal');
        this.showToast('Tickets sorted');
    }

    /**
     * Opens the filter modal and renders filter rows.
     */
    openFilterModal() {
        this.renderFilterRows();
        this.showModal('filterModal');
    }

    /**
     * Renders filter rows in the filter modal.
     */
    renderFilterRows() {
        const container = document.getElementById('filterRowsContainer');
        container.innerHTML = '';
        if (this.currentFilters.length === 0) {
            this.addFilterRow();
        } else {
            this.currentFilters.forEach(filter => this.addFilterRow(filter));
        }
    }

    /**
     * Adds a filter row to the filter modal.
     * @param {Object} filter - The filter configuration.
     */
    addFilterRow(filter = { column: '', relation: '', value: '' }) {
        const container = document.getElementById('filterRowsContainer');
        const row = document.createElement('div');
        row.className = 'modal-dynamic-row';
        row.innerHTML = `
            <select name="filterColumn">
                <option value="id" ${filter.column === 'id' ? 'selected' : ''}>Ticket ID</option>
                <option value="fullName" ${filter.column === 'fullName' ? 'selected' : ''}>Full Name</option>
                <option value="email" ${filter.column === 'email' ? 'selected' : ''}>Email</option>
                <option value="subject" ${filter.column === 'subject' ? 'selected' : ''}>Subject</option>
                <option value="message" ${filter.column === 'message' ? 'selected' : ''}>Message</option>
            </select>
            <select name="filterRelation">
                <option value="contains" ${filter.relation === 'contains' ? 'selected' : ''}>Contains</option>
                <option value="equals" ${filter.relation === 'equals' ? 'selected' : ''}>Equals</option>
                <option value="startsWith" ${filter.relation === 'startsWith' ? 'selected' : ''}>Starts with</option>
                <option value="endsWith" ${filter.relation === 'endsWith' ? 'selected' : ''}>Ends with</option>
            </select>
            <input type="text" name="filterValue" placeholder="Enter value" value="${this.escapeHtml(filter.value)}">
            <button class="modal-delete-btn" title="Remove filter">&times;</button>`;
        row.querySelector('.modal-delete-btn').addEventListener('click', () => row.remove());
        container.appendChild(row);
    }

    /**
     * Resets filters to empty.
     */
    resetFilters() {
        this.currentFilters = [];
        this.renderFilterRows();
    }

    /**
     * Applies filters and refreshes the ticket list.
     */
    applyFilters() {
        this.currentFilters = Array.from(document.querySelectorAll('#filterRowsContainer .modal-dynamic-row'))
            .map(row => ({
                column: row.querySelector('[name=filterColumn]').value,
                relation: row.querySelector('[name=filterRelation]').value,
                value: row.querySelector('[name=filterValue]').value
            }))
            .filter(filter => filter.value.trim() !== '');
        this.loadTickets();
        this.hideModal('filterModal');
        this.showToast(this.currentFilters.length > 0 ? 'Filter applied' : 'Filter cleared');
    }
}

// --- Application Initialization ---

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TatuaTicketingSystem();
});