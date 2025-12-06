import multer from 'multer';
import path from 'path';

const uploadDir = path.resolve('./public/temp');

const storage = multer.diskStorage({
    destination: function( req, file, cb ){
        cb(null, uploadDir)
    },
    filename: function( req, file, cb ){
        cb(null, file.originalname)
    }
})

export const upload = multer({
    storage
})