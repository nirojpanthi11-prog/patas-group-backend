const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Get products context for chatbot
async function getProductsContext() {
  try {
    const Product = require('../models/Product');
    const products = await Product.find({}, 'name price category stock description');
    return products.map(p => `${p.name} - Rs.${p.price} (${p.category}) - Stock: ${p.stock}`).join('\n');
  } catch (err) {
    return 'Products not available';
  }
}

// CHATBOT route - Groq powered
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const productsContext = await getProductsContext();

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are Patas AI, a smart and friendly shopping assistant for Patas Group Store — an AI-powered ecommerce store in Nepal. 

Here are the current products available in our store:
${productsContext}

Your job is to:
- Help customers find products
- Answer questions about delivery, payments, returns
- Give product recommendations
- Help with order tracking
- Be friendly, helpful and concise

Store details:
- Delivery: Free delivery on orders above Rs. 2000, 3-5 days across Nepal
- Payment: Cash on Delivery, eSewa, Khalti
- Returns: 7-day return policy
- Support: support@patasgroup.com, 9800000000
- Hours: 9AM-6PM

Always respond in a helpful, friendly tone. Keep responses concise but informative. Use emojis occasionally to be friendly.`
        },
        {
          role: 'user',
          content: message
        }
      ],
      model: 'llama-3.1-8b-instant',
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not process your request.';
    res.json({ reply });

  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ message: 'AI service error', error: err.message });
  }
});

// RECOMMENDATIONS route
router.post('/recommend', async (req, res) => {
  try {
    const { products, category, current_product_id } = req.body;

    const response = await fetch(`${process.env.AI_SERVICE_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products, category, current_product_id })
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ message: 'AI service error', error: err.message });
  }
});

module.exports = router;
