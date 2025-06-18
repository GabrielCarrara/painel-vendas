// src/pages/AdminDashboard.js
import React from "react";
import Layout from "../components/Layout";

export default function AdminDashboard() {
  return (
    <Layout userType="admin">
      <h2 className="text-3xl font-bold mb-6">Dashboard do Administrador</h2>
      <p>Conteúdo inicial do painel admin aqui.</p>
    </Layout>
  );
}
