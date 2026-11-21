// Existing pages mounted unchanged. They keep their own styles, scoped to these wrappers.
export const AdminEmbed = ({ children }) => <div className="adm adm-embed">{children}</div>
export const AdultEmbed = ({ children }) => <div className="adult ad-embed"><div className="ad-page wide">{children}</div></div>
