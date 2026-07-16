import Compressor from 'compressorjs';

export const compressImage = (blob) => (
    new Promise((resolve, reject) => {
        // Create a new Compressor instance and use its methods
        const compressor = new Compressor(blob, {
            quality: 0.5, // Adjust quality as needed
            maxWidth: 1080, // Adjust maxWidth as needed
            maxHeight: 1080, // Adjust maxHeight as needed
            success(result) {
                resolve(result);
            },
            error(err) {
                reject(err);
            }
        });
    })

)