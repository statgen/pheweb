import React from 'react';
import renderer from 'react-test-renderer';
import NotFound from './NotFound';

test('not found includes search term', () => {
  const search = 'test'
  const compnent = renderer.create(<NotFound location={ { search : 'test' } }  />)
})