import React from 'react';

export const BookError = ({ url }: { url: string }) => {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: `column`,
        textAlign: `center`
      }}
    >
      <p>Unable to load your book {url}</p>
      <p>
        Make sure to have CORS enabled if you are linking to an external resource
      </p>
    </div>
  )
}