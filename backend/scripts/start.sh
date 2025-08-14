#!/bin/bash

# RoadAlert Backend Startup Script
# This script sets up and starts the RoadAlert backend server

echo "🚀 Starting RoadAlert Backend..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v18.0.0 or higher."
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js $NODE_VERSION is installed"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not available. Please install npm."
    exit 1
fi

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Please edit .env file with your configuration before starting the server."
        print_warning "Required configurations:"
        print_warning "  - MONGODB_URI"
        print_warning "  - JWT_SECRET"
        print_warning "  - CLOUDINARY_* (for image uploads)"
        print_warning "  - FIREBASE_* (for push notifications)"
        echo
        read -p "Press Enter to continue after configuring .env file..."
    else
        print_error ".env.example not found. Please create .env file manually."
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        exit 1
    fi
    print_success "Dependencies installed successfully"
else
    print_status "Dependencies already installed"
fi

# Check if MongoDB is running
print_status "Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    # Use mongosh for newer MongoDB versions
    MONGO_CHECK=$(mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null)
elif command -v mongo &> /dev/null; then
    # Use mongo for older MongoDB versions
    MONGO_CHECK=$(mongo --eval "db.adminCommand('ping')" --quiet 2>/dev/null)
else
    print_warning "MongoDB client not found. Cannot verify MongoDB connection."
    print_warning "Please ensure MongoDB is running on the configured URI."
fi

if [[ $MONGO_CHECK == *"ok"* ]]; then
    print_success "MongoDB is running"
else
    print_warning "Cannot connect to MongoDB. Please ensure MongoDB is running."
    print_warning "If you're using a cloud database, ensure your connection string is correct."
fi

# Ask if user wants to seed the database
echo
read -p "Do you want to seed the database with sample data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Seeding database..."
    npm run seed
    if [ $? -eq 0 ]; then
        print_success "Database seeded successfully"
        echo
        print_success "Test accounts created:"
        print_success "  Admin: admin@roadalert.com / Admin123!"
        print_success "  Moderator: moderator@roadalert.com / Mod123!"
        print_success "  User: user1@example.com / User123!"
    else
        print_warning "Database seeding failed, but server can still start"
    fi
fi

echo
print_status "Starting RoadAlert Backend Server..."
echo

# Determine which command to use based on NODE_ENV
if [ "$NODE_ENV" = "production" ]; then
    print_status "Starting in production mode..."
    npm start
else
    print_status "Starting in development mode..."
    if command -v nodemon &> /dev/null; then
        npm run dev
    else
        print_warning "nodemon not found, starting with node..."
        npm start
    fi
fi
