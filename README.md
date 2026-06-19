# Warranty Wallet

Warranty Wallet is a React Native Expo mobile application that helps users digitally manage product warranties, receipts, warranty cards, and expiry reminders in one place.

Many people lose warranty cards or receipts and forget warranty expiry dates for household appliances and electronics. Because of this, they may miss warranty claims and face unnecessary repair or replacement costs. Warranty Wallet solves this problem by allowing users to store warranty details, upload receipt or warranty images, organize products by categories, and receive expiry reminders before the warranty ends.

## Features

* User signup and login
* Add, view, edit, and delete warranty records
* Store product warranty details digitally
* Upload warranty card or receipt images using camera/gallery
* Category-based organization for products
* AI-powered autofill using OCR
* Extract warranty information from uploaded images
* Store warranty images securely using Supabase Storage
* Automatic warranty expiry reminders
* Expo notification support
* Mobile-friendly interface for Android

## Problem Statement

People often lose warranty cards, receipts, or forget warranty expiry dates for household appliances and electronic products. Due to this, they miss warranty claims and may face unnecessary repair or replacement costs.

## Solution

Warranty Wallet provides a digital platform where users can store warranty details, upload warranty or receipt images, organize products into categories, and receive expiry reminders before the warranty ends.

The app also uses AI and OCR to scan warranty documents and automatically fill the required warranty information, making the process faster and easier for users.

## Tech Stack

* React Native
* Expo
* TypeScript / TSX
* Expo Router
* Supabase
* Supabase Authentication
* Supabase Database
* Supabase Storage
* PostgreSQL
* Gemini Flash 2.0 API
* OCR Technology
* Expo Notifications
* Expo Image Picker
* Expo File System
* Visual Studio Code

## Key Modules

### Authentication

Users can create an account and log in securely using Supabase Authentication.

### Warranty Record Management

Users can add and manage warranty records with product details, purchase information, expiry dates, and warranty documents.

### Image Upload

Users can upload receipt or warranty card images from camera or gallery.

### AI Autofill

The app uses OCR and Gemini Flash 2.0 API to extract warranty details from uploaded images and automatically fill required fields.

### Expiry Reminders

Users receive automatic notifications before warranty expiry so they do not miss warranty claims.

### Category Management

Products can be organized into categories for easier searching and management.

## Challenges Faced

* Selecting a reliable AI/OCR solution for extracting warranty details from images
* Gemini Flash 2.0 API was selected because it provided accurate text extraction results
* Initially, images were not being stored permanently in the database
* Supabase Storage buckets were configured to store warranty images properly
* Scheduling notifications at multiple expiry intervals was challenging
* Managing image upload, database records, authentication, and reminders in a single mobile app required proper structure

## Future Enhancements

* Family account sharing
* Cloud backup
* Advanced search and filters
* Calendar integration
* Warranty service center links
* Renewal cost tracking
* Multi-language support
* Analytics dashboard

## Project Structure

```bash
warranty-wallet/
│
├── app/
│   ├── index.tsx
│   ├── login.tsx
│   ├── signup.tsx
│   ├── add-warranty.tsx
│   └── _layout.tsx
│
├── assets/
│   └── images/
│
├── lib/
│   └── supabase.ts
│
├── app.config.js
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
└── README.md
```

## Installation and Setup

Clone the repository:

```bash
git clone https://github.com/eshaa48/warranty-wallet.git
```

Go to the project folder:

```bash
cd warranty-wallet
```

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

## Environment Variables

Create a `.env` file in the root folder and add your required environment variables.

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

The `.env` file is not included in this repository for security reasons.

## Security Note

This project uses API keys and backend credentials through environment variables. Do not upload your `.env` file to GitHub.

## App Platform

This project is designed as a mobile application for Android using React Native and Expo.

## Author

Developed by Eshaa

## Repository

GitHub: https://github.com/eshaa48/warranty-wallet
