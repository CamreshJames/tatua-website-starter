        // Storage Module
        const StorageModule = {
            // Current storage type: memory, session, or local
            currentType: 'local',
            
            setItem: function(key, value) {
                const serializedValue = JSON.stringify(value);
                
                switch(this.currentType) {
                    case 'memory':
                        if (!window.memoryStorage) window.memoryStorage = {};
                        window.memoryStorage[key] = serializedValue;
                        break;
                    case 'session':
                        // Note: sessionStorage not available in Claude artifacts
                        if (!window.memoryStorage) window.memoryStorage = {};
                        window.memoryStorage[key] = serializedValue;
                        break;
                    case 'local':
                        // Note: localStorage not available in Claude artifacts
                        if (!window.memoryStorage) window.memoryStorage = {};
                        window.memoryStorage[key] = serializedValue;
                        break;
                }
            },
            
            getItem: function(key) {
                let value = null;
                
                switch(this.currentType) {
                    case 'memory':
                        if (window.memoryStorage && window.memoryStorage[key]) {
                            value = window.memoryStorage[key];
                        }
                        break;
                    case 'session':
                        if (window.memoryStorage && window.memoryStorage[key]) {
                            value = window.memoryStorage[key];
                        }
                        break;
                    case 'local':
                        if (window.memoryStorage && window.memoryStorage[key]) {
                            value = window.memoryStorage[key];
                        }
                        break;
                }
                
                return value ? JSON.parse(value) : null;
            },
            
            removeItem: function(key) {
                switch(this.currentType) {
                    case 'memory':
                        if (window.memoryStorage) {
                            delete window.memoryStorage[key];
                        }
                        break;
                    case 'session':
                        if (window.memoryStorage) {
                            delete window.memoryStorage[key];
                        }
                        break;
                    case 'local':
                        if (window.memoryStorage) {
                            delete window.memoryStorage[key];
                        }
                        break;
                }
            }
        };

        // User Data Module
        const UserDataModule = {
            users: [
                { username: 'wanjiku', password: 'admin123', role: 'admin', fullName: 'Grace Wanjiku Kamau' },
                { username: 'kiprotich', password: 'user123', role: 'user', fullName: 'David Kiprotich Korir' },
                { username: 'akinyi', password: 'user123', role: 'user', fullName: 'Mercy Akinyi Ochieng' },
                { username: 'mwangi', password: 'user123', role: 'user', fullName: 'James Mwangi Ndung\'u' },
                { username: 'nafula', password: 'user123', role: 'user', fullName: 'Sarah Nafula Wekesa' },
                { username: 'otieno', password: 'admin123', role: 'admin', fullName: 'Peter Otieno Omondi' },
                { username: 'wafula', password: 'user123', role: 'user', fullName: 'John Wafula Situma' },
                { username: 'nyambura', password: 'user123', role: 'user', fullName: 'Jane Nyambura Kariuki' }
            ],
            
            authenticate: function(username, password) {
                return this.users.find(user => 
                    user.username === username && user.password === password
                );
            },
            
            getUserByUsername: function(username) {
                return this.users.find(user => user.username === username);
            }
        };

        // Authentication Module
        const AuthModule = {
            currentUser: null,
            
            init: function() {
                // Check if user is remembered
                const rememberedUser = StorageModule.getItem('rememberedUser');
                if (rememberedUser) {
                    this.currentUser = rememberedUser;
                    this.showMainApp();
                } else {
                    this.showLoginPage();
                }
                
                // Attach login form event
                document.getElementById('loginForm').addEventListener('submit', this.handleLogin.bind(this));
            },
            handleLogin: function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value.trim();
                const rememberMe = document.getElementById('rememberMe').checked;
                
                // Clear previous errors
                this.clearErrors();
                
                // Validate
                if (!username) {
                    this.showError('usernameError', 'Username is required');
                    return;
                }
                if (!password) {
                    this.showError('passwordError', 'Password is required');
                    return;
                }
                
                // Authenticate
                const user = UserDataModule.authenticate(username, password);
                if (!user) {
                    this.showError('passwordError', 'Invalid username or password');
                    return;
                }
                
                this.currentUser = user;
                
                // Remember user if checked
                if (rememberMe) {
                    StorageModule.setItem('rememberedUser', user);
                }
                
                this.showMainApp();
            },
            
            logout: function() {
                this.currentUser = null;
                StorageModule.removeItem('rememberedUser');
                this.showLoginPage();
            },
            
            showLoginPage: function() {
                document.getElementById('loginPage').classList.remove('hidden');
                document.getElementById('mainApp').classList.add('hidden');
                document.getElementById('loginForm').reset();
                this.clearErrors();
            },
            
            showMainApp: function() {
                document.getElementById('loginPage').classList.add('hidden');
                document.getElementById('mainApp').classList.remove('hidden');
                document.getElementById('userGreeting').textContent = `Welcome, ${this.currentUser.fullName}`;
                
                // Load tickets and refresh display
                TicketModule.loadTickets();
                TicketModule.refreshTickets();
            },
            
            showError: function(elementId, message) {
                document.getElementById(elementId).textContent = message;
            },
            
            clearErrors: function() {
                const errorElements = document.querySelectorAll('.error-message');
                errorElements.forEach(element => element.textContent = '');
            },
            
            isAdmin: function() {
                return this.currentUser && this.currentUser.role === 'admin';
            },
            
            getCurrentUsername: function() {
                return this.currentUser ? this.currentUser.username : null;
            }
        };

        // Tab Management Module
        const TabModule = {
            switchTab: function(tabName) {
                // Hide all tab contents
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                
                // Remove active class from all nav tabs
                document.querySelectorAll('.nav-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                
                // Show selected tab
                document.getElementById(tabName).classList.add('active');
                
                // Add active class to clicked nav tab
                event.target.classList.add('active');
                
                // Refresh tickets if switching to tickets list
                if (tabName === 'ticketsList') {
                    TicketModule.refreshTickets();
                }
            }
        };

        // Validation Module
        const ValidationModule = {
            validateEmail: function(email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
            },
            
            validatePhone: function(phone) {
                const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
                return phoneRegex.test(phone);
            },
            
            validateForm: function(formData) {
                const errors = {};
                
                if (!formData.fullName.trim()) {
                    errors.fullName = 'Full name is required';
                } else if (formData.fullName.trim().length < 2) {
                    errors.fullName = 'Full name must be at least 2 characters';
                }
                
                if (!formData.emailAddress.trim()) {
                    errors.emailAddress = 'Email address is required';
                } else if (!this.validateEmail(formData.emailAddress)) {
                    errors.emailAddress = 'Please enter a valid email address';
                }
                
                if (!formData.phoneNumber.trim()) {
                    errors.phoneNumber = 'Phone number is required';
                } else if (!this.validatePhone(formData.phoneNumber)) {
                    errors.phoneNumber = 'Please enter a valid phone number';
                }
                
                if (!formData.category) {
                    errors.category = 'Please select an issue category';
                }
                
                if (!formData.subject.trim()) {
                    errors.subject = 'Subject is required';
                } else if (formData.subject.trim().length < 5) {
                    errors.subject = 'Subject must be at least 5 characters';
                }
                
                if (!formData.message.trim()) {
                    errors.message = 'Message is required';
                } else if (formData.message.trim().length < 10) {
                    errors.message = 'Message must be at least 10 characters';
                }
                
                if (!formData.preferredContact) {
                    errors.preferredContact = 'Please select a preferred contact method';
                }
                
                if (!formData.termsAccepted) {
                    errors.termsAccepted = 'You must accept the terms and conditions';
                }
                
                return errors;
            },
            
            displayErrors: function(errors) {
                // Clear previous errors
                document.querySelectorAll('.error-message').forEach(element => {
                    element.textContent = '';
                });
                
                // Display new errors
                Object.keys(errors).forEach(field => {
                    const errorElement = document.getElementById(field + 'Error');
                    if (errorElement) {
                        errorElement.textContent = errors[field];
                    }
                });
            }
        };

        // Ticket Module
        const TicketModule = {
            tickets: [],
            nextId: 1,
            
            init: function() {
                document.getElementById('ticketForm').addEventListener('submit', this.handleSubmit.bind(this));
                this.loadTickets();
            },
            
            loadTickets: function() {
                const savedTickets = StorageModule.getItem('tickets');
                if (savedTickets) {
                    this.tickets = savedTickets;
                    // Update nextId based on existing tickets
                    if (this.tickets.length > 0) {
                        this.nextId = Math.max(...this.tickets.map(t => t.id)) + 1;
                    }
                }
            },
            
            saveTickets: function() {
                StorageModule.setItem('tickets', this.tickets);
            },
            
            handleSubmit: function(e) {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const ticketData = {};
                
                // Extract form data
                for (let [key, value] of formData.entries()) {
                    if (key === 'termsAccepted') {
                        ticketData[key] = true;
                    } else {
                        ticketData[key] = value;
                    }
                }
                
                // Add checkbox for terms if not checked (will be undefined)
                if (!ticketData.termsAccepted) {
                    ticketData.termsAccepted = false;
                }
                
                // Validate form
                const errors = ValidationModule.validateForm(ticketData);
                
                if (Object.keys(errors).length > 0) {
                    ValidationModule.displayErrors(errors);
                    return;
                }
                
                // Create ticket
                const ticket = {
                    id: this.nextId++,
                    ...ticketData,
                    createdBy: AuthModule.getCurrentUsername(),
                    dateCreated: new Date().toISOString().split('T')[0] + ' ' + 
                                 new Date().toLocaleTimeString('en-US', { hour12: false }),
                    status: 'New',
                    priority: this.determinePriority(ticketData.category)
                };
                
                // Add ticket
                this.tickets.unshift(ticket);
                this.saveTickets();
                
                // Show success message
                this.showSuccess(`Ticket #${ticket.id} has been created successfully!`);
                
                // Reset form
                e.target.reset();
                ValidationModule.displayErrors({});
                
                // Switch to tickets list if user wants to see their ticket
                setTimeout(() => {
                    TabModule.switchTab('ticketsList');
                }, 2000);
            },
            
            determinePriority: function(category) {
                const highPriorityCategories = ['Payment Problems', 'Account Access'];
                const mediumPriorityCategories = ['Mobile App is slow', 'Website Issues'];
                
                if (highPriorityCategories.includes(category)) {
                    return 'High';
                } else if (mediumPriorityCategories.includes(category)) {
                    return 'Medium';
                } else {
                    return 'Low';
                }
            },
            
            showSuccess: function(message) {
                const successElement = document.getElementById('successMessage');
                successElement.textContent = message;
                successElement.classList.remove('hidden');
                
                setTimeout(() => {
                    successElement.classList.add('hidden');
                }, 5000);
            },
            
            refreshTickets: function() {
                this.loadTickets();
                this.renderTicketsTable();
            },
            
            renderTicketsTable: function() {
                const tbody = document.getElementById('ticketsTableBody');
                const currentUser = AuthModule.getCurrentUsername();
                const isAdmin = AuthModule.isAdmin();
                
                // Filter tickets based on user role
                let ticketsToShow = this.tickets;
                if (!isAdmin) {
                    ticketsToShow = this.tickets.filter(ticket => ticket.createdBy === currentUser);
                }
                
                if (ticketsToShow.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 2rem; color: #666;">
                                ${isAdmin ? 'No tickets found' : 'You have not submitted any tickets yet'}
                            </td>
                        </tr>
                    `;
                    return;
                }
                
                tbody.innerHTML = ticketsToShow.map(ticket => `
                    <tr>
                        <td><strong>#${ticket.id}</strong></td>
                        <td>${ticket.fullName}</td>
                        <td>${ticket.category}</td>
                        <td>
                            <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                                 title="${ticket.subject}">
                                ${ticket.subject}
                            </div>
                        </td>
                        <td>${ticket.dateCreated}</td>
                        <td><span class="status-badge status-${ticket.status.toLowerCase()}">${ticket.status}</span></td>
                        <td><span class="priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span></td>
                        <td>
                            <button class="btn btn-danger" onclick="TicketModule.deleteTicket(${ticket.id})" 
                                    title="Delete Ticket">
                                Delete
                            </button>
                        </td>
                    </tr>
                `).join('');
            },
            
            deleteTicket: function(ticketId) {
                if (confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
                    this.tickets = this.tickets.filter(ticket => ticket.id !== ticketId);
                    this.saveTickets();
                    this.renderTicketsTable();
                }
            }
        };

        // App Initialization
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize all modules
            AuthModule.init();
            TicketModule.init();
            
            // Initialize memory storage
            if (!window.memoryStorage) {
                window.memoryStorage = {};
            }
            
            // Add some sample tickets for demo purposes
            const sampleTickets = [
                {
                    id: 1,
                    fullName: 'Grace Wanjiku Kamau',
                    emailAddress: 'grace.wanjiku@email.com',
                    phoneNumber: '+254712345678',
                    category: 'Mobile App is slow',
                    subject: 'App crashes when loading dashboard',
                    message: 'The mobile application keeps crashing whenever I try to access the main dashboard. This started happening after the latest update.',
                    preferredContact: 'Email',
                    termsAccepted: true,
                    createdBy: 'wanjiku',
                    dateCreated: '2024-02-08 10:30:00',
                    status: 'Open',
                    priority: 'Medium'
                },
                {
                    id: 2,
                    fullName: 'David Kiprotich Korir',
                    emailAddress: 'david.kiprotich@email.com',
                    phoneNumber: '+254723456789',
                    category: 'Mobile App is slow',
                    subject: 'Login issues on mobile device',
                    message: 'Cannot log into my account using the mobile app. The login button seems to be unresponsive.',
                    preferredContact: 'Phone',
                    termsAccepted: true,
                    createdBy: 'kiprotich',
                    dateCreated: '2024-02-08 09:15:00',
                    status: 'New',
                    priority: 'Medium'
                },
                {
                    id: 3,
                    fullName: 'Mercy Akinyi Ochieng',
                    emailAddress: 'mercy.akinyi@email.com',
                    phoneNumber: '+254734567890',
                    category: 'Payment Problems',
                    subject: 'Payment not reflecting in account',
                    message: 'I made a payment yesterday but it has not reflected in my account balance. Transaction reference: TXN123456789',
                    preferredContact: 'Email',
                    termsAccepted: true,
                    createdBy: 'akinyi',
                    dateCreated: '2024-02-08 14:45:00',
                    status: 'Open',
                    priority: 'High'
                }
            ];
            
            // Load sample tickets if no tickets exist
            const existingTickets = StorageModule.getItem('tickets');
            if (!existingTickets || existingTickets.length === 0) {
                StorageModule.setItem('tickets', sampleTickets);
                TicketModule.tickets = sampleTickets;
                TicketModule.nextId = 4;
            }
        });

        // Global click handler for tab navigation
        window.TabModule = TabModule;
        window.AuthModule = AuthModule;
        window.TicketModule = TicketModule;
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Ctrl+L for logout
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                if (AuthModule.currentUser) {
                    AuthModule.logout();
                }
            }
            
            // Ctrl+R for refresh tickets (when on tickets list)
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                if (document.getElementById('ticketsList').classList.contains('active')) {
                    TicketModule.refreshTickets();
                }
            }
        });

        // Add form auto-fill for current user when creating tickets
        document.getElementById('fullName').addEventListener('focus', function() {
            if (AuthModule.currentUser && !this.value) {
                this.value = AuthModule.currentUser.fullName;
            }
        });

        // Add real-time validation
        document.querySelectorAll('#ticketForm input, #ticketForm textarea, #ticketForm select').forEach(element => {
            element.addEventListener('blur', function() {
                // Clear error when user starts typing
                const errorElement = document.getElementById(this.name + 'Error');
                if (errorElement) {
                    errorElement.textContent = '';
                }
            });
        });

        // Add character counter for message field
        document.getElementById('message').addEventListener('input', function() {
            const maxLength = 500;
            const currentLength = this.value.length;
            
            // Create or update character counter
            let counter = document.getElementById('messageCounter');
            if (!counter) {
                counter = document.createElement('div');
                counter.id = 'messageCounter';
                counter.style.fontSize = '0.8rem';
                counter.style.color = '#666';
                counter.style.textAlign = 'right';
                counter.style.marginTop = '0.25rem';
                this.parentNode.appendChild(counter);
            }
            
            counter.textContent = `${currentLength}/${maxLength} characters`;
            
            if (currentLength > maxLength * 0.9) {
                counter.style.color = '#e74c3c';
            } else if (currentLength > maxLength * 0.7) {
                counter.style.color = '#f39c12';
            } else {
                counter.style.color = '#666';
            }
        });
        
        // Add print functionality for tickets (admin only)
        function printTickets() {
            if (!AuthModule.isAdmin()) {
                alert('Only administrators can print tickets');
                return;
            }
            
            const printWindow = window.open('', '_blank');
            const ticketsHtml = `
                <html>
                <head>
                    <title>Tatua Tickets Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .header { text-align: center; margin-bottom: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Tatua Ticketing System</h1>
                        <h2>Tickets Report</h2>
                        <p>Generated on: ${new Date().toLocaleString()}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Requester</th>
                                <th>Category</th>
                                <th>Subject</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Priority</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${TicketModule.tickets.map(ticket => `
                                <tr>
                                    <td>#${ticket.id}</td>
                                    <td>${ticket.fullName}</td>
                                    <td>${ticket.category}</td>
                                    <td>${ticket.subject}</td>
                                    <td>${ticket.dateCreated}</td>
                                    <td>${ticket.status}</td>
                                    <td>${ticket.priority}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `;
            
            printWindow.document.write(ticketsHtml);
            printWindow.document.close();
            printWindow.print();
        }

        // Add export functionality (admin only)
        function exportTicketsCSV() {
            if (!AuthModule.isAdmin()) {
                alert('Only administrators can export tickets');
                return;
            }
            
            const headers = ['ID', 'Requester', 'Email', 'Phone', 'Category', 'Subject', 'Message', 'Date Created', 'Status', 'Priority'];
            const csvContent = [
                headers.join(','),
                ...TicketModule.tickets.map(ticket => [
                    ticket.id,
                    `"${ticket.fullName}"`,
                    ticket.emailAddress,
                    ticket.phoneNumber,
                    `"${ticket.category}"`,
                    `"${ticket.subject}"`,
                    `"${ticket.message.replace(/"/g, '""')}"`,
                    ticket.dateCreated,
                    ticket.status,
                    ticket.priority
                ].join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tatua-tickets-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }

        // Make functions globally available
        window.printTickets = printTickets;
        window.exportTicketsCSV = exportTicketsCSV;