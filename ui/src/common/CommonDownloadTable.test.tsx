/* eslint-env jest */
import React from "react";
import renderer from "react-test-renderer";
import { render, fireEvent , screen } from '@testing-library/react'
import CommonDownloadTable, { DownloadTableProps } from './CommonDownloadTable';
test('TODO fix these tests', () => {})
/*
test('renders table link', () => {
  const prop = {
      filename : "" ,
      tableData : [ {"a" : "1" , "b" : "2" } ] ,
      dataToTableRows : (x) => x ,
      tableColumns  : [{ accessor: 'a' }, { accessor: 'b' , 'display' : false }] ,
      defaultSorted : []
  };
  const component = <CommonDownloadTable {...prop}/>;
  const tree = renderer.create(component).toJSON();
  expect(tree).toMatchSnapshot()
})

test('clickdownload link', () => {
  const tableRowToDownloadRow = jest.fn((a) => a);
  const prop = {
      filename : "" ,
      tableData : [ {"a" : "1" , "b" : "2" } ] ,
      dataToTableRows : (x) => x ,
      tableColumns  : [{ accessor: 'a' }]  ,
      tableRowToDownloadRow ,
      defaultSorted : []
  };
  const component = <CommonDownloadTable {...prop}/>;
  render(component);
  const downloadButton = screen.getByText('Download table');
  fireEvent.click(downloadButton);
  fireEvent.click(downloadButton);
  expect(tableRowToDownloadRow).toHaveBeenCalledTimes(2);
})
*/
