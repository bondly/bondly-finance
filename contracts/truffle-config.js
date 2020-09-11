module.exports = {
  // Uncommenting the defaults below 
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    development: {
      host: "192.168.1.244",
      port: 7545,
      network_id: "*"
    },
    test: {
      host: "localhost",
      port: 7545,
      network_id: "*"
    }
  },
  compilers: { solc: { version: "0.6.2" }}
};
