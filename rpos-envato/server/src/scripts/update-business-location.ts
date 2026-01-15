import 'dotenv/config';
import { AppDataSource } from '../config/database';
import { Business } from '../entities/Business.entity';

async function updateBusiness() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    // Get the business repository
    const businessRepo = AppDataSource.getRepository(Business);

    // Find the demo business
    const business = await businessRepo.findOne({ where: {} });

    if (!business) {
      console.log('No business found');
      process.exit(1);
    }

    // Update with location data
    business.state = 'CA';
    business.city = 'San Francisco';
    business.address = '123 Market Street';
    business.zipCode = '94102';
    business.country = 'US';
    business.timezone = 'America/Los_Angeles';
    business.tax = 7.25;

    await businessRepo.save(business);

    console.log('Business updated:', {
      id: business.id,
      name: business.name,
      state: business.state,
      city: business.city,
      tax: business.tax,
      country: business.country,
    });

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateBusiness();
