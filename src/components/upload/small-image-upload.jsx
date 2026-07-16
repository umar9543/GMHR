import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { Button, Stack } from '@mui/material';
import Iconify from 'src/components/iconify';

export default function MultipleImageUploadButton({ handleImageUpload, isImagesUploaded, dynamicId }) {

    return (
        <div>
            <input
                accept="image/*"
                style={{ display: 'none' }}
                id={dynamicId}
                multiple
                type="file"
                onChange={handleImageUpload}
            />
            <label htmlFor={dynamicId}>
                <Button
                    sx={{ padding: '13.5px ' }}
                    variant="outlined"
                    component="span"
                    color='primary'
                    startIcon={isImagesUploaded ? <Iconify icon="lets-icons:done-ring-round" /> : <Iconify icon="mynaui:cloud-upload" />}
                >
                    {isImagesUploaded ? 'Uploaded' : 'Upload'}
                </Button>
            </label>
        </div>
    );
}

MultipleImageUploadButton.propTypes = {
    handleImageUpload: PropTypes.any,
    isImagesUploaded: PropTypes.any,
    dynamicId: PropTypes.any
};