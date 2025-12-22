# **App Name**: Aanand Sagar Billing App

## Core Features:

- Manager Authentication: Secure login for managers using Firebase Authentication.
- Billing Form: A Material UI form for entering customer name, carat details (in/out), and carat type (small/big).
- Total Carat Calculation: Automatically calculate total carat (In Carat - Out Carat).
- Total Amount Calculation: Automatically calculate total amount based on carat type (Small Carat: Total Carat × 17, Big Carat: Total Carat × 20).
- Due Amount Calculation: Automatically calculate due amount (Total Amount - Paid Amount).
- Bill Generation and Storage: Generate a bill summary and save all data (customer details, carat info, amounts, payment details) to Firestore.
- Automated Messaging: Automatically generate and send customer notifications via SMS.
- Owner Panel: Dashboard for owner to view bills, due amounts, manager activity, and reports.
- SMS message tool: LLM is used as tool to choose appropriate message style based on the contents of each individual sale

## Style Guidelines:

- Primary color: Fresh green (#64DD17) to evoke the natural essence of fruits.
- Background color: Light green (#E8F5E9) for a clean and fresh backdrop.
- Accent color: Yellow-green (#9EF909) for a vibrant and complementary highlight to the primary.
- Body and headline font: 'PT Sans', a humanist sans-serif providing a modern and accessible feel for clear readability.
- Use fruit-themed icons related to billing details and customer information.
- Clean and organized layout with Material UI components for a user-friendly billing process.
- Subtle animations for form submissions and data updates to enhance user experience.