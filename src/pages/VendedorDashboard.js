// src/pages/VendedorDashboard.js
import React from "react";
import Layout from "../components/Layout";

export default function VendedorDashboard() {
  return (
    <Layout userType="vendedor">
      <h2 className="text-3xl font-bold mb-6">Painel do Vendedor</h2>
      <p>Conteúdo inicial do painel vendedor aqui.</p>
    </Layout>
  );
}
