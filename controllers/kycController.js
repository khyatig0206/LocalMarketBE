// KYC-related endpoints (Aadhaar parsing via Gemini)

exports.parseAadhaar = async (req, res) => {
  try {
    const fileUrl = req.file?.path;
    const mimetype = req.file?.mimetype || '';
    if (!fileUrl) {
      return res.status(400).json({ message: 'Aadhaar image is required' });
    }
    if (!['image/jpeg', 'image/png'].includes(mimetype)) {
      return res.status(400).json({ message: 'Only JPG/PNG allowed for Aadhaar' });
    }

    const { extractAddressFromAadhaar } = require('../services/gemini');
    const { geocodeAddress } = require('../services/geocode');

    const result = await extractAddressFromAadhaar([fileUrl]);
    const geo = await geocodeAddress(result.fullAddress);

    return res.json({
      address: result.address,
      fullAddress: result.fullAddress,
      rawAddressText: result.rawAddressText,
      latitude: geo?.latitude || null,
      longitude: geo?.longitude || null,
      imageUrl: fileUrl,
    });
  } catch (err) {
    console.error('Parse Aadhaar error:', err);
    res.status(500).json({ message: 'Failed to parse Aadhaar' });
  }
};
