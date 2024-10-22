const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');  // Import Expense model
const User = require('../models/User');        // Import User model
const { Parser } = require('json2csv');        // For generating CSV

// Add an expense
router.post('/', async (req, res) => {
    try {
        const { description, amount, splitMethod, participants } = req.body;

        // Validate the split method and participants
        if (splitMethod === 'percentage') {
            const totalPercentage = participants.reduce((acc, participant) => acc + participant.percentage, 0);
            if (totalPercentage !== 100) {
                return res.status(400).json({ error: 'Percentages must add up to 100%' });
            }
        }

        // Create new expense
        const newExpense = new Expense({
            description,
            amount,
            splitMethod,
            participants
        });

        // Save the expense
        await newExpense.save();
        res.status(201).json(newExpense);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Retrieve individual user expenses
router.get('/:userId', async (req, res) => {
    try {
        const expenses = await Expense.find({ 'participants.userId': req.params.userId });

        if (!expenses.length) {
            return res.status(404).json({ message: 'No expenses found for this user' });
        }

        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Retrieve overall expenses for all users
router.get('/', async (req, res) => {
    try {
        const expenses = await Expense.find().populate('participants.userId', 'name email');
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Download balance sheet as CSV
router.get('/balance-sheet', async (req, res) => {
    try {
        const expenses = await Expense.find().populate('participants.userId', 'name email');

        // Define the fields for the CSV
        const fields = [
            { label: 'Description', value: 'description' },
            { label: 'Amount', value: 'amount' },
            { label: 'Split Method', value: 'splitMethod' },
            { label: 'Participant', value: 'participants.userId.name' },
            { label: 'Amount Owed', value: 'participants.amountOwed' }
        ];

        // Create the CSV file
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(expenses);

        // Set CSV file headers and send the file
        res.header('Content-Type', 'text/csv');
        res.attachment('balance-sheet.csv');
        return res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
