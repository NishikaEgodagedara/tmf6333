require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

const BASE_URL = '/tmf-api/serviceCatalogManagement/v4';

// Base URL root route handler — Fix for "Cannot GET" error
app.get(BASE_URL, (req, res) => {
  res.send('TMF Service Catalog Management API root');
});

// Mongoose model
const serviceSpecSchema = new mongoose.Schema({
  '@type': { type: String, default: 'ServiceSpecification' },
  id: String,
  href: String,
  name: String,
  version: String,
  lifecycleStatus: String,
  isBundle: Boolean,
  lastUpdate: String
}, { collection: 'serviceSpecifications' });

const ServiceSpecification = mongoose.model('ServiceSpecification', serviceSpecSchema);

// Root route
app.get('/', (req, res) => {
  res.send('🚀 TMF Service Catalog API with MongoDB is running');
});

// Logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// GET all serviceSpecifications
app.get(`${BASE_URL}/serviceSpecification`, async (req, res) => {
  try {
    const specs = await ServiceSpecification.find();
    res.status(200).json(specs);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// POST create serviceSpecification
app.post(`${BASE_URL}/serviceSpecification`, async (req, res) => {
  try {
    const id = req.body.id || uuidv4();
    const now = new Date().toISOString();
    const spec = new ServiceSpecification({
      ...req.body,
      id,
      href: `http://${req.headers.host}${BASE_URL}/serviceSpecification/${id}`,
      lastUpdate: now,
      '@type': req.body['@type'] || 'ServiceSpecification'
    });
    await spec.save();
    res.status(201).json(spec);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// GET serviceSpecification by ID
app.get(`${BASE_URL}/serviceSpecification/:id`, async (req, res) => {
  try {
    const spec = await ServiceSpecification.findOne({ id: req.params.id });
    if (!spec) {
      return res.status(404).json({ code: 404, error: 'Not found' });
    }
    res.status(200).json(spec);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// PATCH update serviceSpecification by ID
app.patch(`${BASE_URL}/serviceSpecification/:id`, async (req, res) => {
  try {
    const updated = await ServiceSpecification.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, lastUpdate: new Date().toISOString() },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ code: 404, error: 'Not found' });
    }
    updated.href = `http://${req.headers.host}${BASE_URL}/serviceSpecification/${updated.id}`;
    await updated.save();
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// DELETE serviceSpecification by ID
app.delete(`${BASE_URL}/serviceSpecification/:id`, async (req, res) => {
  try {
    const deleted = await ServiceSpecification.findOneAndDelete({ id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ code: 404, error: 'Not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// MongoDB connection setup
const user = process.env.MONGO_USER;
const password = encodeURIComponent(process.env.MONGO_PW);
const dbName = process.env.MONGO_DB;
const clusterUrl = 'cluster0.mr1gaxu.mongodb.net'; // Your MongoDB Atlas cluster hostname

const mongoUri = `mongodb+srv://${user}:${password}@${clusterUrl}/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}${BASE_URL}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });
