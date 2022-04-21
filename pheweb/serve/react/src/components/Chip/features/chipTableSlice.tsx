import { ActionReducerMapBuilder, createAsyncThunk, createSlice, SliceCaseReducers } from "@reduxjs/toolkit";
import { ChipData } from "../chipModel";
import "regenerator-runtime/runtime";
import { NoInfer } from "@reduxjs/toolkit/dist/tsHelpers";

export type State = {
  status: string;
  error: string | null;
  table: State | null;
} & Partial<ChipData>;

interface LineNumber {
     number: number;
}

// http://crocodillon.com/blog/always-catch-localstorage-security-and-quota-exceeded-errors
export type QuotaException = DOMException & LineNumber
export const isQuotaExceeded = (e: QuotaException) : boolean => {
  let quotaExceeded : boolean;
  switch (e?.code) {
  case 22:
      quotaExceeded = true;
      break;
  case 1014:
      // Firefox
      quotaExceeded = (e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      break;
  default:
      quotaExceeded = e?.number === -2147024882
      break;
  }
  return quotaExceeded;
}


export const fetchData = createAsyncThunk('table/fetchData', async (url : string, { rejectWithValue }) => {
    const response: Response = await fetch(url)
    try {
	if (response.status === 200) {
	    return response.json()
	} else {
	    return rejectWithValue({status: response.status, message: response.statusText})
	}
    } catch (error) {
	return rejectWithValue({status: response.status, message: response.statusText})
    }
})


const pending = (state: State, action) => {
	    state.status = 'loading'
	    console.log('load')
}

const fulfilled = (state: State, action) => {
    console.log(action)
    state.status = 'done'
    state.data = action.payload.data
    state.columns = action.payload.columns
    if (action.payload.data.length < 5000){
	try {
	    sessionStorage.setItem(`, ${action.payload.data}}`, JSON.stringify(action.payload))
	} catch(e) {
	    if (isQuotaExceeded(e)) {
		console.warn('sessionstorage quota exceeded (tableSlice), clear storage!')
		sessionStorage.clear()
	    } else {
		alert(e)
	    }
	}
    }
}

const rejected = (state: State, action) => {
    console.log(action)
    state.status = 'failed'
    state.error = action.payload
}

const extraReducers = (builder: ActionReducerMapBuilder<NoInfer<State>>) => {
    builder.addCase(fetchData.pending, pending);
    builder.addCase(fetchData.fulfilled, fulfilled);
    builder.addCase(fetchData.rejected, rejected);
};


export const tableSlice = createSlice<State, SliceCaseReducers<State>>({
    name: 'table',
    initialState: {
	table: null,
	status: 'idle',
	error: null
    },
    reducers: {
	setData: (state: State, action) => {
	    console.log('setting data')
	    state.data = action.payload.data
	    state.columns = action.payload.columns
	}
    },
    extraReducers: extraReducers
})

export const { setData } = tableSlice.actions

export default tableSlice.reducer
