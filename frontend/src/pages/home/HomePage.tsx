import React from 'react';
import { Header } from '../../components/header/Header';
import Footer from '../../components/footer/Footer';

export const HomePage = () => {
  return (
    <>
      <Header />
      {/* This main tag will grow to fill space if #root is a flex container */}
      <main style={{ flex: 1, padding: '2rem' }}>
        <h1>Home Page</h1>
        <p>Test text for the Nokia AC Labs project simulation.</p>
      </main>
      <Footer />
    </>
  );
};