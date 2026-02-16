import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

Element.prototype.scrollTo = function () {};
Element.prototype.scrollIntoView = function () {};

URL.createObjectURL = () => 'blob:mock';
URL.revokeObjectURL = () => {};
