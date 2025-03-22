import { createRoot } from "react-dom/client";
import React from 'react';
import Calculator from "./Calculator";
import * as Sentry from "@sentry/react";

Sentry.init({
	dsn: "https://a2c11aa7a21741df93d4a04cc87fa8e7@o4509023277023232.ingest.us.sentry.io/4509023278727168"
});

const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");

const root = createRoot(container);
root.render(<Calculator />);
