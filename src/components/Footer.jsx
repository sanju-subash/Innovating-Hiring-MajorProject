import React from "react";
import { footer } from "../constants";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-gray-800 via-gray-900 to-black text-gray-300 text-center py-6">
      <div className="container mx-auto px-4">
        {footer.map((item, index) => (
          <p key={index} className="text-sm mb-1 text-gray-200 hover:text-white transition-all duration-300">
            {item.text.replace("${currentYear}", currentYear)}
          </p>
        ))}
      </div>
    </footer>
  );
};

export default Footer;