import mongoose, { Schema } from "mongoose";

// Stub del paso rojo: sin campos, para que los tests fallen por aserción.
const consultaSchema = new Schema({}, { autoCreate: false, autoIndex: false });

export const Consulta = mongoose.models.Consulta ?? mongoose.model("Consulta", consultaSchema);
