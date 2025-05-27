'use client';

import React, { useState, useEffect } from 'react';

// Define an interface for the invoice data expected from the API
interface Invoice {
  userId: string;
  stripeInvoiceId: string;
  stripeSubscriptionId?: string | null;
  status: string;
  amountDue: number; // in cents
  amountPaid: number; // in cents
  amountRemaining: number; // in cents
  currency: string;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  createdDate: string; // ISO date string
  dueDate?: string | null; // ISO date string
  periodStart: string; // ISO date string
  periodEnd: string; // ISO date string
  description?: string | null;
}

// Helper function to format currency (cents to dollars)
const formatCurrency = (amountInCents: number, currencyCode: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }).format(amountInCents / 100);
};

// Helper function to format dates
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Helper function to derive interval
const getInterval = (periodStart: string, periodEnd: string): string => {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 360 && diffDays <= 370) return 'Annually';
  if (diffDays >= 28 && diffDays <= 32) return 'Monthly';
  if (diffDays >= 80 && diffDays <= 100) return 'Quarterly'; // Example
  return 'Custom'; // Or based on description if available
};

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/invoices');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error: ${response.status}`);
        }
        const data: Invoice[] = await response.json();
        setInvoices(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch invoices.');
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <p>Loading invoices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', color: 'red' }}>
        <p>Error loading invoices: {error}</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <p>No invoices found.</p>
      </div>
    );
  }

  // Basic styling for the table (replace with actual app styles/components)
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'Arial, sans-serif',
  };
  const thStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    padding: '8px',
    textAlign: 'left',
    backgroundColor: '#f2f2f2',
  };
  const tdStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    padding: '8px',
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', fontFamily: 'Arial, sans-serif' }}>My Invoices</h1>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Invoice ID</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Description</th>
            <th style={thStyle}>Interval</th>
            <th style={thStyle}>Period</th>
            <th style={thStyle}>Amount</th>
            {/* <th style={thStyle}>Tax</th>  Omitted as not in current InvoiceData */}
            <th style={thStyle}>Amount Paid</th>
            <th style={thStyle}>Amount Due</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.stripeInvoiceId}>
              <td style={tdStyle}>{invoice.stripeInvoiceId.substring(0,15)}...</td>
              <td style={tdStyle}>{formatDate(invoice.createdDate)}</td>
              <td style={tdStyle}>{invoice.status}</td>
              <td style={tdStyle}>{invoice.description || 'N/A'}</td>
              <td style={tdStyle}>{getInterval(invoice.periodStart, invoice.periodEnd)}</td>
              <td style={tdStyle}>
                {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
              </td>
              <td style={tdStyle}>
                {/* Display amountPaid if status is 'paid', else amountDue as 'total amount' */}
                {formatCurrency(invoice.status === 'paid' ? invoice.amountPaid : invoice.amountDue, invoice.currency)}
              </td>
              <td style={tdStyle}>{formatCurrency(invoice.amountPaid, invoice.currency)}</td>
              <td style={tdStyle}>{formatCurrency(invoice.amountRemaining, invoice.currency)}</td>
              <td style={tdStyle}>
                {invoice.hostedInvoiceUrl && (
                  <a 
                    href={invoice.hostedInvoiceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ marginRight: '10px', textDecoration: 'none' }}
                  >
                    View
                  </a>
                )}
                {invoice.invoicePdfUrl && (
                  <a 
                    href={invoice.invoicePdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    Download
                  </a>
                )}
                {(!invoice.hostedInvoiceUrl && !invoice.invoicePdfUrl) && 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InvoicesPage;
