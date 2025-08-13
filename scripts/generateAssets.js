import { createSplashAndIcon } from './utils/createAssets';

// Create the splash and icon images
createSplashAndIcon().then(() => {
  console.log('Asset creation complete');
}).catch(error => {
  console.error('Error:', error);
});
