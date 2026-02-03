/**
 * AutoLinkClients - Automatically detects and links client names in any text
 * 
 * Wrap any text content with this component to automatically convert
 * recognized client names into clickable ClientLink components.
 * 
 * Usage:
 *   <AutoLinkClients>
 *     Posted for Kodiak Club yesterday
 *   </AutoLinkClients>
 *   
 *   // "Kodiak Club" will automatically become a clickable link
 * 
 * @param {ReactNode} children - Text content to scan for client names
 * @param {string} className - Additional CSS classes
 */

import React, { useMemo } from 'react';
import ClientLink from './ClientLink';
import { useClients } from '../../contexts/ClientsContext';

const AutoLinkClients = ({ 
  children, 
  className = '',
  onClientUpdate = null 
}) => {
  const { clients, clientsByName } = useClients();

  // Process text and replace client names with links
  const processedContent = useMemo(() => {
    if (!children || !clients || clients.length === 0) {
      return children;
    }

    // Handle non-string children (React elements, etc.)
    if (typeof children !== 'string') {
      // If it's an array, process each element
      if (Array.isArray(children)) {
        return children.map((child, index) => {
          if (typeof child === 'string') {
            return processText(child, index);
          }
          return child;
        });
      }
      return children;
    }

    return processText(children, 0);
  }, [children, clients, clientsByName]);

  // Process a text string and replace client names with ClientLink components
  function processText(text, keyPrefix) {
    if (!text || typeof text !== 'string') return text;

    // Sort client names by length (longest first) to match longer names first
    // e.g., "Paul McClean Design" before "Paul"
    const sortedNames = Object.keys(clientsByName).sort((a, b) => b.length - a.length);
    
    if (sortedNames.length === 0) return text;

    // Create a regex pattern that matches any client name (case-insensitive)
    // Escape special regex characters in names
    const escapedNames = sortedNames.map(name => 
      name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const pattern = new RegExp(`(${escapedNames.join('|')})`, 'gi');

    // Split text by client names
    const parts = text.split(pattern);
    
    if (parts.length === 1) {
      // No matches found
      return text;
    }

    // Map parts to either text or ClientLink components
    return parts.map((part, index) => {
      if (!part) return null;
      
      // Check if this part matches a client name (case-insensitive)
      const lowerPart = part.toLowerCase();
      const matchedClient = clientsByName[lowerPart];
      
      if (matchedClient) {
        return (
          <ClientLink 
            key={`${keyPrefix}-${index}`}
            client={matchedClient}
            onClientUpdate={onClientUpdate}
          />
        );
      }
      
      return part;
    });
  }

  return <span className={className}>{processedContent}</span>;
};

export default AutoLinkClients;
