const express = require("express");
const route = express.Router();
const Part = require("../models/PartModels");

route.post("/addPart", async (req, res) => {
  try {
    const { partNo, description, binQuantity } = req.body;

    if (!partNo || !description || !binQuantity) {
      return res.status(400).json({ message: "Enter the missing fields" });
    }

    // Validate binQuantity is a positive number
    if (binQuantity < 0) {
      return res
        .status(400)
        .json({ message: "Bin quantity must be a positive number" });
    }

    const existingPart = await Part.findOne({ partNo });
    if (existingPart) {
      return res.status(400).json({ message: "Part number already exists" });
    }

    const newPart = new Part({
      partNo,
      description,
      binQuantity,
    });

    await newPart.save();

    res.status(201).json({ message: "Part added successfully", part: newPart });
  } catch (error) {
    console.error("Error adding part:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

route.get("/getAllParts", async (req, res) => {
  try {
    const parts = await Part.find().sort({ createdAt: -1 });

    if (parts.length === 0) {
      return res.status(404).json({ message: "No parts found" });
    }

    res.status(200).json({ message: "Parts retrieved successfully", parts });
  } catch (error) {
    console.error("Error retrieving parts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

route.get("/getPart/:partNo", async (req, res) => {
  try {
    const part = await Part.findOne({ partNo: req.params.partNo });
    if (!part) {
      return res.status(404).json({ error: "Part not found" });
    }
    res.json({ message: "Part retrieved successfully", part });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

route.put("/editPart/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { partNo, description, binQuantity } = req.body;

    if (!partNo && !description && binQuantity === undefined) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const part = await Part.findById(id);

    if (!part) {
      return res.status(404).json({ message: "Part not found" });
    }

    // Check if part number already exists (if being updated)
    if (partNo && partNo !== part.partNo) {
      const existingPart = await Part.findOne({ partNo });
      if (existingPart) {
        return res.status(400).json({ message: "Part number already exists" });
      }
    }

    if (partNo) {
      part.partNo = partNo;
    }
    if (description) {
      part.description = description;
    }
    if (binQuantity !== undefined) {
      if (binQuantity < 0) {
        return res
          .status(400)
          .json({ message: "Bin quantity must be a positive number" });
      }
      part.binQuantity = binQuantity;
    }

    await part.save();

    res.status(200).json({ message: "Part updated successfully", part });
  } catch (error) {
    console.error("Error editing part:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

route.delete("/deletePart/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const part = await Part.findById(id);

    if (!part) {
      return res.status(404).json({ message: "Part not found" });
    }

    await Part.findByIdAndDelete(id);

    res.status(200).json({ message: "Part deleted successfully" });
  } catch (error) {
    console.error("Error deleting part:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = route;
