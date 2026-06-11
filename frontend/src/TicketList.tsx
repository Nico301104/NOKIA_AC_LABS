// src/TicketList.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/tickets')
      .then(response => {
        setTickets(response.data);
      })
      .catch(error => {
        console.error("Eroare la conexiune:", error);
        setError("Nu m-am putut conecta la serverul backend!");
      });
  }, []);

  if (error) {
    return <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>;
  }

  return (
    <div>
      <h3>Tichete (Date Placeholder):</h3>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {tickets.map((ticket: any) => (
          <li key={ticket.id} style={{ 
              border: '1px solid #ccc', 
              margin: '10px 0', 
              padding: '10px',
              borderRadius: '5px'
          }}>
            <strong>#{ticket.id} - {ticket.title}</strong>
            <br />
            Status: {ticket.status} | Prioritate: {ticket.priority}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TicketList;