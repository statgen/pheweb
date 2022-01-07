import { configureStore ,
  createSerializableStateInvariantMiddleware,
  createImmutableStateInvariantMiddleware } from '@reduxjs/toolkit'
import tableReducer from './features/chipTableSlice'

const serializableCheck = createSerializableStateInvariantMiddleware()
const immutableCheck = createImmutableStateInvariantMiddleware()
const middleware = (getDefaultMiddleware) => getDefaultMiddleware().concat([serializableCheck, immutableCheck])
const reducer = { table: tableReducer }
export default configureStore({ reducer, middleware })
