## NODE.JS

- Node 16.x || 18.x

## USING YARN (Recommend)

- yarn install
- yarn dev

## USING NPM

- npm i OR npm i --legacy-peer-deps
- npm run dev
import React, { useState } from "react";
import {
  Autocomplete,
  TextField,
  Grid,
  Button,
  Container,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import Stack from "@mui/material/Stack";
import { paths } from "src/routes/paths";
import CustomBreadcrumbs from "src/components/custom-breadcrumbs";
import { DatePicker } from "@mui/x-date-pickers";
import ProductSpecificInfo from "./Purchase";

const steps = ["Purchase Order Information", "Product Information", "Product Specific Information"];

const PurchaseOrder = () => {
  const [activeStep, setActiveStep] = useState(0);

  
  const handleNext = () => setActiveStep((prevStep) => prevStep + 1);
  const handleBack = () => setActiveStep((prevStep) => prevStep - 1);

  return (
    <Container>
      <CustomBreadcrumbs
        heading="Purchase Order Information"
        links={[
          { name: "Home", href: paths.dashboard.root },
          { name: "Purchase Order" },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* Stepper UI */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step 1: Purchase Order Information */}
      {activeStep === 0 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Purchase Order Information
          </Typography>

          {/* Your Existing Form Inputs for Purchase Order Information */}
          <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2} sx={{ mb: 3 }}>
            <TextField fullWidth label="Booking Reference No" value={RefNO} onChange={(e) => setRefNO(e.target.value)} />
            <TextField fullWidth label="Available Booking Qty" value={Qty} onChange={(e) => setQty(e.target.value)} />
            <TextField fullWidth label="Available Booking Value" value={BookVal} onChange={(e) => setBookVal(e.target.value)} />
            <TextField fullWidth label="PO Number" value={PONO} onChange={(e) => setPONO(e.target.value)} />
            <DatePicker label="Placement Date" value={startDate} onChange={setStartDate} />
          </Box>

          {/* Navigation Buttons */}
          <Stack flexDirection="row" justifyContent="flex-end">
            <LoadingButton variant="contained" onClick={handleNext}>
              Next
            </LoadingButton>
          </Stack>
        </Box>
      )}

      {/* Step 2: Product Information */}
      {activeStep === 1 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Product Information
          </Typography>

          {/* Your Existing Form Inputs for Product Information */}
          <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2} sx={{ mb: 3 }}>
            <Autocomplete
              options={productPortfolioData}
              getOptionLabel={(option) => option?.PortfolioName || ""}
              renderInput={(params) => <TextField {...params} label="Product Portfolio" />}
              onChange={(e, newValue) => setProductPortfolio(newValue?.PortfolioID || null)}
            />
          </Box>

          {/* Navigation Buttons */}
          <Stack flexDirection="row" justifyContent="space-between">
            <Button variant="contained" onClick={handleBack}>
              Back
            </Button>
            <LoadingButton variant="contained" onClick={handleNext}>
              Next
            </LoadingButton>
          </Stack>
        </Box>
      )}

      {/* Step 3: Product Specific Information */}
      {activeStep === 2 && <ProductSpecificInfo />}
    </Container>
  );
};

export default PurchaseOrder;
