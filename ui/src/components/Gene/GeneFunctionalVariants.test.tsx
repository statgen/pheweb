/* eslint-env jest */
import React from 'react';
import renderer from 'react-test-renderer';
import { render, fireEvent , screen } from '@testing-library/react'
import GeneFunctionalVariants from './GeneFunctionalVariants';
import { GeneContext, GeneState } from "./GeneContext";
import selectedPhenotype from "./GeneFunctionalVariants.test.data/selectedPhenotype.json";

test('TODO fix these tests', () => {})

/*
test('render without context', () => {
  const component = <GeneFunctionalVariants/>;
  const tree = renderer.create(component).toJSON();
  expect(tree).toMatchSnapshot()
})


test('render with context', () => {
    const GeneContextProvider = (params : { children }) => {
	const gene = "APOE";
	const genePhenotype = {   "phenotypes": [], "region": { "chrom": 19,
								"end": 45009393,
								"start": 44805791
							      } }; // GenePhenotypes.Data
	const errorMessage = undefined;

	return (<GeneContext.Provider value={{ gene,
                                         selectedPhenotype ,
                                         genePhenotype ,
                                         errorMessage }}>
    { params.children }
		</GeneContext.Provider>)
    }
  const component =   <GeneContextProvider>
	<GeneFunctionalVariants/>
  </GeneContextProvider>;
  const tree = renderer.create(component).toJSON();
  expect(tree).toMatchSnapshot()
})
*/
