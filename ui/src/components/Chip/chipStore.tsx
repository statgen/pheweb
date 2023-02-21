import {
  configureStore,
  createImmutableStateInvariantMiddleware,
  createSerializableStateInvariantMiddleware
} from "@reduxjs/toolkit";
import tableReducer from "./features/chipTableSlice";
import { CurriedGetDefaultMiddleware } from "@reduxjs/toolkit/src/getDefaultMiddleware";

const serializableCheck = createSerializableStateInvariantMiddleware()
const immutableCheck = createImmutableStateInvariantMiddleware()
const middleware = (getDefaultMiddleware : CurriedGetDefaultMiddleware<any>) => getDefaultMiddleware().concat([serializableCheck, immutableCheck])
const reducer = { table: tableReducer }
export default configureStore({ reducer, middleware })
