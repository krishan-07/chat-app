import React from "react";
import { OptionProps, StylesConfig } from "react-select";
import ProfileImage from "../ProfileImage";

interface UserOption {
  value: string; // Corresponds to `user._id`
  label: string; // Corresponds to `user.username`
  avatar: string; // URL for the user's avatar
}

export const customStyles: StylesConfig<UserOption, false> = {
  // Style for the dropdown menu
  menu: (base) => ({
    ...base,
    backgroundColor: "#383b3e", // Dropdown menu background color
    borderRadius: "8px", // Rounded corners
    marginTop: "5px", // Margin above dropdown
    zIndex: 9999, // Ensure it displays above other components
  }),

  // Style for the list of options
  menuList: (base) => ({
    ...base,
    maxHeight: "200px", // Set a maximum height for the dropdown
    overflowY: "auto", // Allow scrolling if there are many options
  }),

  // Style for individual option items
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused
      ? "#505355" // Background color on hover
      : state.isSelected
      ? "#383b3e" // Background color when selected
      : "#55595c", // Default background color
    color: "#ffffff", // White text color
    padding: 10, // Padding for options
    display: "flex", // Flex layout
    alignItems: "center", // Center align text
    cursor: "pointer", // Pointer cursor for hover
  }),

  // Style for the control (input field)
  control: (base, state) => ({
    ...base,
    borderRadius: "10px",
    borderColor: state.isFocused ? "#0056b3" : "#ccc", // Border color
    backgroundColor: "#212529", // Input field background color
    color: "#ffffff", // Text color in the input field
    fontWeight: 500,
    fontSize: "1rem",
  }),

  // Style for the placeholder text
  placeholder: (base) => ({
    ...base,
    color: "#aaaaaa", // Placeholder text color
  }),

  // Style for the single selected value
  singleValue: (base) => ({
    ...base,
    color: "#ffffff", // Text color for the selected value
  }),

  // Style for the input text (typing text)
  input: (base) => ({
    ...base,
    color: "#ffffff", // Typing text color
  }),

  // Style for the selected items when `isMulti` is enabled
  multiValue: (base) => ({
    ...base,
    backgroundColor: "grey", // Background color for selected items
    color: "white", // Text color for selected items
    borderRadius: "6px", // Border radius to make them rounded
    padding: "2px 4px", // Padding for selected items
    marginRight: "5px", // Space between selected options
  }),

  // Style for the label of the selected items when `isMulti` is enabled
  multiValueLabel: (base) => ({
    ...base,
    color: "#ffffff", // Text color inside the selected item
    fontWeight: "500", // Make label text bold
  }),

  // Style for the remove button inside the selected items
  multiValueRemove: (base) => ({
    ...base,
    color: "white", // Remove button color
    cursor: "pointer", // Pointer cursor on hover
    ":hover": {
      backgroundColor: "none", // Hover effect for the remove button
      color: "white", // Remove button color on hover
    },
  }),
};

const CustomOption: React.FC<OptionProps<UserOption, boolean>> = (props) => {
  const { data, innerRef, innerProps, isSelected } = props;

  return (
    <div
      ref={innerRef}
      {...innerProps}
      style={{
        backgroundColor: isSelected ? "#3b8c9f" : "transparent",
        display: "flex",
        alignItems: "center",
        color: "white",
        padding: "10px",
        cursor: "pointer",
      }}
    >
      <ProfileImage size="35px" src={data.avatar} alt="profile-img" />
      <div className="ms-2">{data.label}</div>
    </div>
  );
};

export { CustomOption };
