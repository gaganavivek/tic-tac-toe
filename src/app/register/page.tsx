"use client";
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function RegisterPage() {
  const sp = useSearchParams();
  const preEmail = sp.get('email') ?? '';
  const preName = sp.get('name') ?? '';

  const [email, setEmail] = useState(preEmail);
  const [displayName, setDisplayName] = useState(preName);
  const [username, setUsername] = useState('');

  return (
    <div style={{ padding: 20 }}>
      {preEmail && (
        <div style={{ marginBottom: 12 }}>
          <strong>New user detected.</strong> Create account to finish signing in.
        </div>
      )}
      <form method="post" onSubmit={/* call POST /api/users */ (e) => { e.preventDefault(); /* ... */ }}>
        {/* fields: username, displayName, email */}
        {/* on successful create: set cookie / redirect to home */}
      </form>
    </div>
  );
}