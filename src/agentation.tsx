import React from "react";
import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";

const div = document.createElement("div");
document.body.appendChild(div);
const root = createRoot(div);
root.render(<Agentation />);
