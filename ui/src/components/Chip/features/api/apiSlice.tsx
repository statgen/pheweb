import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
} from "@reduxjs/toolkit/query/react";
import { ApiError, VariantResults } from "../../types/types";
import { resolveURL } from "../../../Configuration/configurationModel";

const transformResponse = (response: VariantResults) => {
  response.results.forEach((result) => {
    result.anno = response.anno[result.variant];
    result.rec_add =
      result.mlogp_rec && result.mlogp_add
        ? result.mlogp_rec - result.mlogp_add
        : null;
  });
  return response;
}
const query = (query) => query ?`/results/${query}`: '/top';

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: resolveURL("/api/v1/chip") }) as BaseQueryFn<
    string | FetchArgs,
    unknown,
    ApiError,
    {}
  >,
  endpoints: (builder) => ({
    getVariantResults: builder.query<VariantResults, string>({
      query,
      transformResponse,
    })
  }),
});

export const { useGetVariantResultsQuery } = apiSlice;
