// utils/getCityIdFromName.js

import City from '@/models/City';

export async function getCityIdFromName(cityName) {
  const formattedCityName = decodeURIComponent(cityName).toLowerCase();

  const city = await City.findOne({
    "city-name": new RegExp(`^${formattedCityName}$`, 'i')
  });

  if (!city) {
    throw new Error('City not found');
  }

  return city._id;
}
