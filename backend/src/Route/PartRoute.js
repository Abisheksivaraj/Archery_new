const express = require("express");
const route = express.Router();
const Part = require("../models/PartModels");

route.post("/addPart", async (req, res) => {
  try {
    const { partName, partNo, quantity } = req.body;

    if (!partName || !partNo || !quantity) {
      return res.status(400).json({ message: "Enter the missing fields" });
    }

    const existingPart = await Part.findOne({ partNo });
    if (existingPart) {
      return res.status(400).json({ message: "Part number already exists" });
    }

    const newPart = new Part({
      partName,
      partNo,
      quantity,
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
    const parts = await Part.find();

    if (parts.length === 0) {
      return res.status(404).json({ message: "No parts found" });
    }

    res.status(200).json({ message: "Parts retrieved successfully", parts });
  } catch (error) {
    console.error("Error retrieving parts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

route.put("/editPart/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { partName, quantity, partNo } = req.body;

    if (!partName && quantity && partNo === undefined) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const part = await Part.findById(id);

    if (!part) {
      return res.status(404).json({ message: "Part not found" });
    }

    if (partName) {
      part.partName = partName;
    }
    if (partNo) {
      part.partNo = partNo;
    }
    if (quantity !== undefined) {
      part.quantity = quantity;
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
