// src/models/tenantSettings.model.js
import mongoose from 'mongoose';

const tenantSettingsSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  defaultCurrency: { type: String, default: 'USD' },
  defaultLanguage: { type: String, default: 'en' },
  // ... other settings
});

export default mongoose.model('TenantSettings', tenantSettingsSchema);
