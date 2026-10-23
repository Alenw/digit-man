
import * as React from 'react';
import "./globals.css";
import { Providers } from './providers';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="utf-8"
    >
      <head>
        {/*<script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js" />*/}
        <script src="/Core/live2dcubismcore.min.js" />
      </head>
      {/*<body className="min-h-full flex flex-col">{children}</body>*/}
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
