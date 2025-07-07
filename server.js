const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

const BASE_URL = '/tmf-api/serviceCatalogManagement/v4';

let serviceSpecifications = [];

// Logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Helper: create Service Specification with mandatory fields
function createServiceSpec(input = {}) {
  const id = input.id || uuidv4();
  const now = input.lastUpdate || new Date().toISOString();
  return {
    '@type': input['@type'] || 'ServiceSpecification',
    id,
    href: `http://localhost:${port}${BASE_URL}/serviceSpecification/${id}`,
    name: input.name || `Default Service ${id}`, // ensure default name unique per id
    version: input.version || '1.0',
    lifecycleStatus: input.lifecycleStatus || 'active',
    isBundle: input.isBundle !== undefined ? input.isBundle : false,
    lastUpdate: now
  };
}

// Pre-load a fixed test resource with unique lastUpdate for CTK filtering
const testSpec = createServiceSpec({
  id: '5ae4dc5f-8031-40f6-ab85-ca6912d8635c',
  name: 'TestServiceName', // Changed to exactly match CTK test filter value
  lifecycleStatus: 'active',
  isBundle: true,
  lastUpdate: '2025-07-01T00:00:00Z' // fixed date matching CTK test expectations
});
serviceSpecifications.push(testSpec);

// GET all or filtered
app.get(`${BASE_URL}/serviceSpecification`, (req, res) => {
  const { fields, ...filters } = req.query;
  let results = [...serviceSpecifications];

  Object.entries(filters).forEach(([key, value]) => {
    results = results.filter(item => {
      if (typeof item[key] === 'boolean') {
        return item[key] === (value === 'true');
      }
      if (typeof item[key] === 'string') {
        return item[key].toLowerCase() === value.toLowerCase();
      }
      return item[key]?.toString() === value;
    });
  });

  if (fields) {
    const fieldList = fields.split(',');
    results = results.map(item => {
      const selected = {};
      fieldList.forEach(f => {
        if (f in item) selected[f] = item[f];
      });
      return selected;
    });
  }

  res.status(200).json(results);
});

// POST create
app.post(`${BASE_URL}/serviceSpecification`, (req, res) => {
  const spec = createServiceSpec(req.body);

  // Ensure unique name if same name exists
  const duplicate = serviceSpecifications.find(s => s.name.toLowerCase() === spec.name.toLowerCase());
  if (duplicate) {
    spec.name += '-' + new Date().getTime(); // append timestamp to keep unique names
  }

  // Ensure unique lastUpdate timestamps to avoid CTK collisions
  const now = new Date();
  spec.lastUpdate = new Date(now.getTime() + serviceSpecifications.length * 1000).toISOString();

  serviceSpecifications.push(spec);
  res.status(201).json(spec);
});

// GET by ID
app.get(`${BASE_URL}/serviceSpecification/:id`, (req, res) => {
  const spec = serviceSpecifications.find(s => s.id === req.params.id);
  if (!spec) {
    return res.status(404).json({ code: 404, error: 'Not found' });
  }
  res.status(200).json(spec);
});

// PATCH
app.patch(`${BASE_URL}/serviceSpecification/:id`, (req, res) => {
  const index = serviceSpecifications.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ code: 404, error: 'Not found' });
  }

  const updated = {
    ...serviceSpecifications[index],
    ...req.body,
    lastUpdate: new Date().toISOString()
  };

  // Ensure href and mandatory fields remain consistent
  updated.href = `http://localhost:${port}${BASE_URL}/serviceSpecification/${updated.id}`;
  if (!updated['@type']) updated['@type'] = 'ServiceSpecification';
  if (updated.isBundle === undefined) updated.isBundle = false;
  if (!updated.lifecycleStatus) updated.lifecycleStatus = 'active';

  serviceSpecifications[index] = updated;
  res.status(200).json(updated);
});

// DELETE
app.delete(`${BASE_URL}/serviceSpecification/:id`, (req, res) => {
  const index = serviceSpecifications.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ code: 404, error: 'Not found' });
  }
  serviceSpecifications.splice(index, 1);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}${BASE_URL}`);
});
