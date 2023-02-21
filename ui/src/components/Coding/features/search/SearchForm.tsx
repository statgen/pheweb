import React from "react";
import { useState } from "react";
import { useLocation, Link } from "react-router-dom";

export const SearchForm = () => {
  const [value, setValue] = useState("");

  const actionURL = value === ''?'/coding':`/coding/${value}`;
  const { pathname } = useLocation();
  const top = !pathname.startsWith("/coding/");

  return (
    <div style={{ paddingBottom: "10px" }}>
      <form style={{ display: "inline-block" }}
            action={actionURL}
            method={'GET'}>
        <label>
          <input
            style={{ width: "30ch" }}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
            placeholder={`show all results for a gene or variant`}
          />
        </label>
        <input type="submit" value="go"/>
      </form>
      <span style={{ padding: "20px" }}>or</span>
      <Link
        to="/coding"
        style={
          top ? { color: "#777777", cursor: "not-allowed" } : { color: "black" }
        }
      >
        show top results
      </Link>
    </div>
  );
};
