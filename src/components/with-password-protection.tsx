'use client';

import React, { ComponentType } from 'react';

// This is a Higher-Order Component (HOC)
export default function withPasswordProtection<P extends object>(
  WrappedComponent: ComponentType<P>
) {
  const WithPasswordProtection = (props: P) => {
    // Directly render the wrapped component without any password check.
    return <WrappedComponent {...props} />;
  };

  WithPasswordProtection.displayName = `WithPasswordProtection(${getDisplayName(
    WrappedComponent
  )})`;

  return WithPasswordProtection;
}

function getDisplayName(WrappedComponent: ComponentType<any>) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}
