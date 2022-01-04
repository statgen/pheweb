import { getDefaultMiddleware } from '@reduxjs/toolkit'
import { configureStore } from '@reduxjs/toolkit'
import tableReducer from './ChipTableSlice'


export default configureStore({
    reducer: { 
        table: tableReducer
    },
    middleware: [...getDefaultMiddleware({immutableCheck: false, serializableCheck: false})]
})
