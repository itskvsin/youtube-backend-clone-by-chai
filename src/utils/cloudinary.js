import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

(async function() {

    // Configuration
    cloudinary.config({ 
        cloud_name: 'dsntppcgp', 
        api_key: '626717539378177', 
        api_secret: '' // Click 'View API Keys' above to copy your API secret
    });
})();