const i=/^(-+|\.+|nil|n\/a|\(?temp\)?)$/i;function n(t){return t?String(t).split(/\s+/).filter(e=>e&&!i.test(e)).join(" ").trim():""}export{n as c};
