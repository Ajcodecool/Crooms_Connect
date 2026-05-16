import { useState, useEffect } from 'react';

const CrimNet = ({ chatSidebar, chatMain }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [crimeData, setCrimeData] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('contracts');
  const [scanResults, setScanResults] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [newsFeed, setNewsFeed] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);

  const getStatusColor = (service) => {
    if (service.error) return '#ff0000'; // red for error
    if (!service.data) return '#ffaa00'; // yellow for unknown

    const statusStr = (
      service.data.status?.description ||
      service.data.status ||
      'operational'
    )
      .toString()
      .toLowerCase();
    if (statusStr.includes('major') || statusStr.includes('outage'))
      return '#ff0000'; // red
    if (statusStr.includes('degraded') || statusStr.includes('partial'))
      return '#ffaa00'; // yellow
    return '#00ff00'; // green for operational
  };

  const safeText = (value) =>
    typeof value === 'object' ? JSON.stringify(value) : value;

  const performNetworkScan = async () => {
    setIsScanning(true);
    setScanResults([]);

    try {
      // Get user's public IP and additional info
      const [ipResponse, ipInfoResponse] = await Promise.all([
        fetch('https://api.ipify.org?format=json'),
        fetch('https://ipapi.co/json/'),
      ]);

      const ipData = await ipResponse.json();
      const ipInfo = await ipInfoResponse.json();
      const userIP = ipData.ip;

      const commonPorts = [
        { port: 22, service: 'SSH', description: 'Secure Shell' },
        { port: 80, service: 'HTTP', description: 'Web Server' },
        { port: 443, service: 'HTTPS', description: 'Secure Web Server' },
        { port: 21, service: 'FTP', description: 'File Transfer Protocol' },
        { port: 25, service: 'SMTP', description: 'Email Server' },
        { port: 53, service: 'DNS', description: 'Domain Name System' },
        { port: 3389, service: 'RDP', description: 'Remote Desktop Protocol' },
        { port: 3306, service: 'MySQL', description: 'Database Server' },
        { port: 8080, service: 'HTTP-ALT', description: 'Alternative HTTP' },
        { port: 8443, service: 'HTTPS-ALT', description: 'Alternative HTTPS' },
      ];

      const results = [];
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate initial network delay

      const openPorts = [];
      const services = [];
      const portDetails = [];

      // Simulate scanning each port on user's IP with more realistic probabilities
      for (const portInfo of commonPorts) {
        await new Promise((resolve) =>
          setTimeout(resolve, 150 + Math.random() * 200),
        ); // Variable scan delay

        // More realistic port probabilities based on common usage
        let probability = 0.1; // Base low probability
        if (portInfo.port === 80 || portInfo.port === 443) probability = 0.7; // Web ports more likely
        if (portInfo.port === 22) probability = 0.3; // SSH somewhat common
        if (portInfo.port === 53) probability = 0.4; // DNS common

        const isOpen = Math.random() < probability;

        if (isOpen) {
          openPorts.push(portInfo.port);
          services.push(portInfo.service);
          portDetails.push({
            port: portInfo.port,
            service: portInfo.service,
            description: portInfo.description,
            status: 'open',
            version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}`,
          });
        }
      }

      // Simulate discovering devices on the network with more realistic data
      const devices = [];
      const deviceTypes = [
        { type: 'Router', vendor: 'Netgear', model: 'Nighthawk' },
        { type: 'Smart TV', vendor: 'Samsung', model: 'QLED' },
        { type: 'Gaming Console', vendor: 'Sony', model: 'PlayStation' },
        { type: 'Smartphone', vendor: 'Apple', model: 'iPhone' },
        { type: 'Laptop', vendor: 'Dell', model: 'XPS' },
        { type: 'Desktop PC', vendor: 'HP', model: 'Pavilion' },
        { type: 'IoT Device', vendor: 'Amazon', model: 'Echo' },
        { type: 'Printer', vendor: 'HP', model: 'LaserJet' },
        { type: 'Smart Bulb', vendor: 'Philips', model: 'Hue' },
        { type: 'Security Camera', vendor: 'Ring', model: 'Doorbell' },
      ];

      const numDevices = Math.floor(Math.random() * 6) + 2; // 2-7 devices for more realistic network

      for (let i = 0; i < numDevices; i++) {
        const deviceInfo =
          deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        const lastOctet = Math.floor(Math.random() * 254) + 1;
        const deviceIP =
          userIP.split('.').slice(0, 3).join('.') + '.' + lastOctet;

        // Generate more realistic MAC addresses with common vendor prefixes
        const macPrefixes = [
          '00:1B:44',
          '00:1C:14',
          '00:1D:7D',
          '00:1E:8F',
          '00:1F:9F',
          '00:21:5C',
          '00:22:68',
          '00:23:CD',
        ];
        const macPrefix =
          macPrefixes[Math.floor(Math.random() * macPrefixes.length)];
        const macSuffix = Array.from({ length: 3 }, () =>
          Math.floor(Math.random() * 256)
            .toString(16)
            .padStart(2, '0'),
        ).join(':');
        const macAddress = `${macPrefix}:${macSuffix}`.toUpperCase();

        devices.push({
          ip: deviceIP,
          mac: macAddress,
          type: deviceInfo.type,
          vendor: deviceInfo.vendor,
          model: deviceInfo.model,
          hostname: `${deviceInfo.vendor.toLowerCase()}-${deviceInfo.model.toLowerCase().replace(' ', '-')}-${i + 1}`,
          status: 'active',
          os:
            deviceInfo.type === 'Router'
              ? 'Embedded Linux'
              : deviceInfo.type === 'Gaming Console'
                ? 'Custom OS'
                : deviceInfo.type === 'Smartphone'
                  ? 'iOS/Android'
                  : deviceInfo.type === 'Laptop' ||
                      deviceInfo.type === 'Desktop PC'
                    ? 'Windows/Linux/macOS'
                    : 'Embedded OS',
        });
      }

      // Determine vulnerability based on open ports and services
      const highRiskPorts = [22, 3389, 3306, 21]; // SSH, RDP, MySQL, FTP
      const hasHighRiskOpen = openPorts.some((port) =>
        highRiskPorts.includes(port),
      );
      const isVulnerable = hasHighRiskOpen || Math.random() > 0.8;

      results.push({
        ip: userIP,
        status: openPorts.length > 0 ? 'open' : 'filtered',
        openPorts,
        services,
        portDetails,
        vulnerable: isVulnerable,
        hostname: `${ipInfo.city || 'Unknown'}-${ipInfo.region || 'Location'}`
          .toLowerCase()
          .replace(' ', '-'),
        location: `${ipInfo.city}, ${ipInfo.region}, ${ipInfo.country_name}`,
        isp: ipInfo.org || ipInfo.asn,
        devices,
        scanTime: new Date().toLocaleString(),
        totalHosts: devices.length + 1,
        networkRange: `${userIP.split('.').slice(0, 3).join('.')}.0/24`,
      });

      setScanResults(results);
    } catch (error) {
      console.error('Error getting IP or scanning:', error);
      setScanResults([
        {
          ip: 'Error',
          status: 'error',
          openPorts: [],
          services: [],
          vulnerable: false,
          hostname: 'Unable to scan - ' + error.message,
          devices: [],
        },
      ]);
    }

    setIsScanning(false);
  };

  const renderIncidentDetails = (service) => {
    if (!service.data) return null;

    let incidents = [];
    if (service.name === 'Cloudflare' && service.data.incidents) {
      incidents = service.data.incidents.slice(0, 3);
    } else if (service.name === 'Google Cloud' && service.data) {
      incidents = service.data.slice(0, 3);
    } else if (service.name === 'GitHub' && service.data.incidents) {
      incidents = service.data.incidents.slice(0, 2);
    } else if (service.name === 'Discord' && service.data.incidents) {
      incidents = service.data.incidents.slice(0, 2);
    } else if (service.name === 'Heroku' && service.data.incidents) {
      incidents = service.data.incidents.slice(0, 2);
    } else if (service.name === 'DigitalOcean' && service.data.incidents) {
      incidents = service.data.incidents.slice(0, 2);
    } else if (service.name === 'Vercel' && service.data.incidents) {
      incidents = service.data.incidents.slice(0, 2);
    } else if (service.name === 'Netlify' && service.data.incidents) {
      incidents = service.data.incidents.slice(0, 2);
    } else if (service.name === 'Linode' && service.data.incidents) {
      incidents = service.data.incidents.slice(0, 2);
    } else if (service.name === 'OVH' && service.data.incidents) {
      incidents = service.data.incidents.slice(0, 2);
    }

    return incidents.map((incident, i) => (
      <div
        key={i}
        style={{
          marginLeft: '10px',
          marginBottom: '5px',
          border: '1px solid #333',
          padding: '3px',
        }}
      >
        <p style={{ margin: '2px 0', fontWeight: 'bold' }}>
          {safeText(incident.name || incident.title)}
        </p>
        <p style={{ margin: '2px 0', fontSize: '0.7em' }}>
          Status: {safeText(incident.status || incident.status_impact)}
        </p>
        {incident.started_at && (
          <p style={{ margin: '2px 0', fontSize: '0.7em' }}>
            Started: {new Date(incident.started_at).toLocaleString()}
          </p>
        )}
        {incident.resolved_at && (
          <p style={{ margin: '2px 0', fontSize: '0.7em' }}>
            Resolved: {new Date(incident.resolved_at).toLocaleString()}
          </p>
        )}
        {incident.created_at && (
          <p style={{ margin: '2px 0', fontSize: '0.7em' }}>
            Created: {new Date(incident.created_at).toLocaleString()}
          </p>
        )}
        {incident.impact && (
          <p style={{ margin: '2px 0', fontSize: '0.7em' }}>
            Impact: {safeText(incident.impact)}
          </p>
        )}
        {incident.description && (
          <p style={{ margin: '2px 0', fontSize: '0.7em' }}>
            Description:{' '}
            {typeof incident.description === 'string'
              ? incident.description.length > 100
                ? incident.description.substring(0, 100) + '...'
                : incident.description
              : safeText(incident.description)}
          </p>
        )}
      </div>
    ));
  };

  useEffect(() => {
    // Fetch stock data
    fetch(
      'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=demo',
    )
      .then((response) => response.json())
      .then((data) => {
        if (data['Time Series (5min)']) {
          const latest = Object.keys(data['Time Series (5min)'])[0];
          setStockData(data['Time Series (5min)'][latest]);
        }
      })
      .catch((err) => console.error('Stock API error:', err));

    // Fetch crime data (using FBI API)
    fetch(
      'https://api.usa.gov/crime/fbi/cde/arrest/state/CA/all?from=2020&to=2020&API_KEY=demo',
    )
      .then((response) => response.json())
      .then((data) => setCrimeData(data))
      .catch((err) => console.error('Crime API error:', err));

    // Fetch comprehensive server status
    const fetchServerStatus = async () => {
      const services = [
        {
          name: 'Cloudflare',
          url: 'https://www.cloudflarestatus.com/api/v2/status.json',
          location: { lat: 37.7749, lon: -122.4194 },
        },
        {
          name: 'Azure',
          url: 'https://azure.status.microsoft/en-us/status/api/v2/status.json',
          location: { lat: 47.6062, lon: -122.3321 },
        },
        {
          name: 'Google Cloud',
          url: 'https://status.cloud.google.com/incidents.json',
          location: { lat: 37.4419, lon: -122.143 },
        },
        {
          name: 'GitHub',
          url: 'https://www.githubstatus.com/api/v2/status.json',
          location: { lat: 37.7749, lon: -122.4194 },
        },
        {
          name: 'Discord',
          url: 'https://discordstatus.com/api/v2/status.json',
          location: { lat: 37.7749, lon: -122.4194 },
        },
        {
          name: 'Heroku',
          url: 'https://status.heroku.com/api/v3/current-status',
          location: { lat: 37.7749, lon: -122.4194 },
        },
        {
          name: 'DigitalOcean',
          url: 'https://status.digitalocean.com/api/v2/status.json',
          location: { lat: 40.7128, lon: -74.006 },
        },
        {
          name: 'Vercel',
          url: 'https://vercel-status.com/api/v2/status.json',
          location: { lat: 37.7749, lon: -122.4194 },
        },
        {
          name: 'Netlify',
          url: 'https://www.netlifystatus.com/api/v2/status.json',
          location: { lat: 37.7749, lon: -122.4194 },
        },
        {
          name: 'Linode',
          url: 'https://status.linode.com/api/v2/status.json',
          location: { lat: 35.7796, lon: -78.6382 },
        },
        {
          name: 'OVH',
          url: 'https://status.ovhcloud.com/api/v2/status.json',
          location: { lat: 48.8566, lon: 2.3522 },
        },
      ];

      const statusPromises = services.map(async (service) => {
        try {
          const response = await fetch(service.url);
          const data = await response.json();
          return { ...service, data, error: null };
        } catch (err) {
          return { ...service, data: null, error: err.message };
        }
      });

      const results = await Promise.all(statusPromises);
      setServerStatus(results);
    };

    fetchServerStatus();

    // Fetch news feed
    const fetchNewsFeed = async () => {
      try {
        const newsItems = [];

        // Fetch tech news from Hacker News
        const hnResponse = await fetch(
          'https://hacker-news.firebaseio.com/v0/topstories.json',
        );
        const hnStoryIds = await hnResponse.json();
        const topHnIds = hnStoryIds.slice(0, 5); // Get top 5 stories

        const hnPromises = topHnIds.map((id) =>
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(
            (res) => res.json(),
          ),
        );
        const hnStories = await Promise.all(hnPromises);

        hnStories.forEach((story) => {
          if (story && story.title && story.url) {
            newsItems.push({
              id: `hn-${story.id}`,
              title: story.title,
              url: story.url,
              source: 'Hacker News',
              type: 'tech',
              date: new Date(story.time * 1000),
            });
          }
        });

        // Fetch data breaches from Have I Been Pwned
        const breachResponse = await fetch(
          'https://haveibeenpwned.com/api/v3/breaches',
        );
        const breaches = await breachResponse.json();
        const recentBreaches = breaches.slice(0, 5); // Get 5 most recent breaches

        recentBreaches.forEach((breach) => {
          newsItems.push({
            id: `breach-${breach.Name}`,
            title: `${breach.Title} - ${breach.PwnCount.toLocaleString()} accounts affected`,
            url: `https://haveibeenpwned.com/PwnedWebsites/${breach.Name}`,
            source: 'Have I Been Pwned',
            type: 'breach',
            date: new Date(breach.BreachDate),
          });
        });

        // Sort by date (most recent first)
        newsItems.sort((a, b) => b.date - a.date);

        setNewsFeed(newsItems);
        setNewsLoading(false);
      } catch (error) {
        console.error('News API error:', error);
        setNewsLoading(false);
      }
    };

    fetchNewsFeed();
  }, []);

  return (
    <div
      style={{
        backgroundColor: '#000',
        color: '#00ff00',
        fontFamily: 'monospace',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h1
        style={{
          textAlign: 'center',
          fontSize: '1.5em',
          margin: '10px 0',
          borderBottom: '1px solid #00ff00',
          paddingBottom: '10px',
        }}
      >
        CRIM.NET
      </h1>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Chat Sidebar */}
        <div
          style={{
            width: '240px',
            height: '100%',
            borderRight: '1px solid #00ff00',
            padding: '10px',
            overflow: 'auto',
          }}
        >
          <h2 style={{ marginTop: 0, color: '#00ff00' }}>Chat</h2>
          {chatSidebar}
        </div>

        {/* Main Content Area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '10px',
            overflow: 'auto',
          }}
        >
          {/* Crim.net Content */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '20px',
              }}
            >
              <div
                style={{
                  flex: '0 0 30%',
                  border: '1px solid #00ff00',
                  padding: '10px',
                }}
              >
                <h2 style={{ marginTop: 0 }}>Data Terminal</h2>
                <div style={{ display: 'flex', marginBottom: '10px' }}>
                  <button
                    onClick={() => setActiveTab('contracts')}
                    style={{
                      backgroundColor:
                        activeTab === 'contracts' ? '#00ff00' : '#333',
                      color: activeTab === 'contracts' ? '#000' : '#00ff00',
                      border: '1px solid #00ff00',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '0.8em',
                    }}
                  >
                    Contracts
                  </button>
                  <button
                    onClick={() => setActiveTab('stocks')}
                    style={{
                      backgroundColor:
                        activeTab === 'stocks' ? '#00ff00' : '#333',
                      color: activeTab === 'stocks' ? '#000' : '#00ff00',
                      border: '1px solid #00ff00',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '0.8em',
                    }}
                  >
                    Stocks
                  </button>
                  <button
                    onClick={() => setActiveTab('crime')}
                    style={{
                      backgroundColor:
                        activeTab === 'crime' ? '#00ff00' : '#333',
                      color: activeTab === 'crime' ? '#000' : '#00ff00',
                      border: '1px solid #00ff00',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '0.8em',
                    }}
                  >
                    Crime
                  </button>
                  <button
                    onClick={() => setActiveTab('servers')}
                    style={{
                      backgroundColor:
                        activeTab === 'servers' ? '#00ff00' : '#333',
                      color: activeTab === 'servers' ? '#000' : '#00ff00',
                      border: '1px solid #00ff00',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '0.8em',
                    }}
                  >
                    Servers
                  </button>
                  <button
                    onClick={() => setActiveTab('scan')}
                    style={{
                      backgroundColor:
                        activeTab === 'scan' ? '#00ff00' : '#333',
                      color: activeTab === 'scan' ? '#000' : '#00ff00',
                      border: '1px solid #00ff00',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '0.8em',
                    }}
                  >
                    Network Scan
                  </button>
                </div>
                <div style={{ height: '200px', overflow: 'auto' }}>
                  {activeTab === 'contracts' && (
                    <ul>
                      <li>Bank Heist - $100,000</li>
                      <li>Jewelry Store - $75,000</li>
                      <li>Art Gallery - $50,000</li>
                    </ul>
                  )}
                  {activeTab === 'stocks' && (
                    <div>
                      <h3>Stock Market</h3>
                      {stockData ? (
                        <div>
                          <p>Open: ${stockData['1. open']}</p>
                          <p>High: ${stockData['2. high']}</p>
                          <p>Low: ${stockData['3. low']}</p>
                          <p>Close: ${stockData['4. close']}</p>
                          <p>Volume: {stockData['5. volume']}</p>
                        </div>
                      ) : (
                        <p>Loading stock data...</p>
                      )}
                    </div>
                  )}
                  {activeTab === 'crime' && (
                    <div>
                      <h3>Crime Data</h3>
                      {crimeData ? (
                        <div>
                          <p>Crime statistics loaded</p>
                          {/* Display crime data here */}
                        </div>
                      ) : (
                        <p>Loading crime data...</p>
                      )}
                    </div>
                  )}
                  {activeTab === 'servers' && (
                    <div>
                      <h3>Cloud Services Status</h3>
                      {serverStatus ? (
                        <div style={{ fontSize: '0.8em' }}>
                          {serverStatus.map((service, index) => (
                            <div
                              key={index}
                              style={{
                                marginBottom: '15px',
                                border: '1px solid #00ff00',
                                padding: '5px',
                              }}
                            >
                              <h4
                                style={{
                                  margin: '0 0 5px 0',
                                  color: getStatusColor(service),
                                }}
                              >
                                {service.name}
                              </h4>
                              {service.error ? (
                                <p style={{ color: '#ff0000' }}>
                                  Error: {service.error}
                                </p>
                              ) : (
                                <div>
                                  <p>
                                    Status:{' '}
                                    {safeText(
                                      service.data?.status?.description ||
                                        service.data?.status ||
                                        'Operational',
                                    )}
                                  </p>
                                  <p>
                                    Updated:{' '}
                                    {service.data?.page?.updated_at
                                      ? new Date(
                                          service.data.page.updated_at,
                                        ).toLocaleString()
                                      : new Date().toLocaleString()}
                                  </p>
                                  {renderIncidentDetails(service)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>Loading server status...</p>
                      )}
                    </div>
                  )}
                  {activeTab === 'scan' && (
                    <div>
                      <h3>Network Scanner</h3>
                      <button
                        onClick={performNetworkScan}
                        disabled={isScanning}
                        style={{
                          backgroundColor: '#00ff00',
                          color: '#000',
                          border: '1px solid #00ff00',
                          padding: '10px 20px',
                          cursor: isScanning ? 'not-allowed' : 'pointer',
                          fontFamily: 'monospace',
                          fontSize: '0.9em',
                          marginBottom: '10px',
                        }}
                      >
                        {isScanning ? 'Scanning...' : 'Start Network Scan'}
                      </button>
                      <div
                        style={{
                          fontSize: '0.8em',
                          maxHeight: '150px',
                          overflow: 'auto',
                        }}
                      >
                        {scanResults.length > 0 ? (
                          <div>
                            <p>
                              Network Scan Results - {scanResults[0].scanTime}
                            </p>
                            {scanResults.map((result, index) => (
                              <div
                                key={index}
                                style={{
                                  marginBottom: '15px',
                                  border: '1px solid #333',
                                  padding: '5px',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '5px',
                                  }}
                                >
                                  <p>
                                    <strong>Target:</strong> {result.ip} (
                                    {result.hostname})
                                  </p>
                                  <p
                                    style={{
                                      color:
                                        result.status === 'open'
                                          ? '#00ff00'
                                          : '#ffaa00',
                                    }}
                                  >
                                    <strong>Status:</strong>{' '}
                                    {result.status.toUpperCase()}
                                  </p>
                                </div>
                                <p>
                                  <strong>Location:</strong> {result.location}
                                </p>
                                <p>
                                  <strong>ISP:</strong> {result.isp}
                                </p>
                                <p>
                                  <strong>Network:</strong>{' '}
                                  {result.networkRange} ({result.totalHosts}{' '}
                                  hosts)
                                </p>

                                {result.portDetails &&
                                  result.portDetails.length > 0 && (
                                    <div style={{ marginTop: '10px' }}>
                                      <p>
                                        <strong>Open Ports:</strong>
                                      </p>
                                      <div
                                        style={{
                                          marginLeft: '10px',
                                          fontSize: '0.7em',
                                        }}
                                      >
                                        {result.portDetails.map(
                                          (port, portIndex) => (
                                            <div
                                              key={portIndex}
                                              style={{
                                                marginBottom: '3px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                              }}
                                            >
                                              <span>
                                                Port {port.port}/{port.service}{' '}
                                                ({port.description})
                                              </span>
                                              <span
                                                style={{ color: '#00ff00' }}
                                              >
                                                {port.version}
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}

                                <p
                                  style={{
                                    color: result.vulnerable
                                      ? '#ff0000'
                                      : '#00ff00',
                                    marginTop: '5px',
                                  }}
                                >
                                  <strong>Security Status:</strong>{' '}
                                  {result.vulnerable
                                    ? 'VULNERABLE - High-risk ports open'
                                    : 'SECURE - No critical vulnerabilities detected'}
                                </p>

                                {result.devices &&
                                  result.devices.length > 0 && (
                                    <div style={{ marginTop: '10px' }}>
                                      <p>
                                        <strong>
                                          Network Devices (
                                          {result.devices.length}):
                                        </strong>
                                      </p>
                                      <div
                                        style={{
                                          maxHeight: '100px',
                                          overflow: 'auto',
                                        }}
                                      >
                                        {result.devices.map(
                                          (device, deviceIndex) => (
                                            <div
                                              key={deviceIndex}
                                              style={{
                                                marginLeft: '10px',
                                                marginBottom: '3px',
                                                border: '1px solid #555',
                                                padding: '2px',
                                                fontSize: '0.7em',
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  justifyContent:
                                                    'space-between',
                                                }}
                                              >
                                                <span>
                                                  {device.ip} -{' '}
                                                  {device.hostname}
                                                </span>
                                                <span
                                                  style={{ color: '#00ff00' }}
                                                >
                                                  {device.status}
                                                </span>
                                              </div>
                                              <div
                                                style={{
                                                  marginTop: '2px',
                                                  color: '#aaa',
                                                }}
                                              >
                                                {device.vendor} {device.model} |{' '}
                                                {device.type} | {device.os}
                                              </div>
                                              <div
                                                style={{
                                                  fontSize: '0.6em',
                                                  color: '#888',
                                                }}
                                              >
                                                MAC: {device.mac}
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p>
                            No scan results yet. Click &quot;Start Network
                            Scan&quot; to begin.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  flex: '0 0 65%',
                  border: '1px solid #00ff00',
                  padding: '10px',
                }}
              >
                <h2 style={{ marginTop: 0 }}>Global Server Map</h2>
                <div
                  style={{
                    backgroundColor: '#111',
                    height: '300px',
                    position: 'relative',
                    border: '1px solid #00ff00',
                    backgroundImage:
                      'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxzdHlsZT4KICAgICAgLnNlYSB7IGZpbGw6ICMwMDJmZmY7IH0KICAgICAgLmxhbmQgeyBmaWxsOiAjMDA4MDAwOyB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDAyZmZmIi8+CiAgPHBhdGggZD0iTTAgMCA0MDAgMzAwIiBjbGFzcz0ibGFuZCIvPgogIDxwYXRoIGQ9Ik0wIDMwMCA0MDAgMCIgY2xhc3M9ImxhbmQiLz4KICA8cGF0aCBkPSJNNTAgMjUwIDUwIDIwMCIgY2xhc3M9ImxhbmQiLz4KICA8cGF0aCBkPSJNMTUwIDI1MCAxNTAgMjAwIiBjbGFzcz0ibGFuZCIvPgogIDxwYXRoIGQ9Ik0yNTAgMjUwIDI1MCAyMDAiIGNsYXNzPSJsYW5kIi8+CiAgPHBhdGggZD0iTTM1MCAyNTAgMzUwIDIwMCIgY2xhc3M9ImxhbmQiLz4KPC9zdmc+")',
                    backgroundSize: 'cover',
                  }}
                >
                  {/* Service dots */}
                  {serverStatus &&
                    serverStatus.map((service, index) => {
                      const location = service.location || { lat: 0, lon: 0 };
                      // Convert lat/lon to x/y on 400x300 map
                      const x = ((location.lon + 180) / 360) * 400;
                      const y = ((90 - location.lat) / 180) * 300;
                      return (
                        <div
                          key={index}
                          style={{
                            position: 'absolute',
                            top: y + 'px',
                            left: x + 'px',
                            width: '12px',
                            height: '12px',
                            backgroundColor: getStatusColor(service),
                            borderRadius: '50%',
                            border: '1px solid #fff',
                            cursor: 'pointer',
                            title: `${service.name}: ${service.error ? 'Error' : safeText(service.data?.status?.description || 'Operational')}`,
                          }}
                        ></div>
                      );
                    })}
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: '20px',
                border: '1px solid #00ff00',
                padding: '10px',
              }}
            >
              <h2 style={{ marginTop: 0 }}>News Feed</h2>
              {newsLoading ? (
                <p>Loading latest news...</p>
              ) : newsFeed.length > 0 ? (
                <div
                  style={{
                    maxHeight: '300px',
                    overflow: 'auto',
                    fontSize: '0.8em',
                  }}
                >
                  {newsFeed.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        marginBottom: '10px',
                        border: '1px solid #333',
                        padding: '5px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '3px',
                        }}
                      >
                        <a
                          href={item.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          style={{
                            color:
                              item.type === 'breach' ? '#ffaa00' : '#00ff00',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: '0.9em',
                          }}
                        >
                          {item.title}
                        </a>
                        <span
                          style={{
                            color:
                              item.type === 'breach' ? '#ffaa00' : '#00ff00',
                            fontSize: '0.7em',
                            marginLeft: '5px',
                          }}
                        >
                          [{item.source}]
                        </span>
                      </div>
                      <div style={{ color: '#aaa', fontSize: '0.7em' }}>
                        {item.date.toLocaleDateString()}{' '}
                        {item.date.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No news available at this time.</p>
              )}
            </div>
          </div>

          {/* Chat Button */}
          <div
            style={{
              flex: 1,
              border: '1px solid #00ff00',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => setChatOpen(true)}
              style={{
                backgroundColor: '#00ff00',
                color: '#000',
                border: 'none',
                padding: '10px 20px',
                fontSize: '1.2em',
                fontFamily: 'monospace',
                cursor: 'pointer',
                borderRadius: '5px',
              }}
            >
              Open Chat
            </button>
          </div>
        </div>
      </div>

      {/* Chat Pop-out Modal */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: chatOpen ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            backgroundColor: '#000',
            border: '2px solid #00ff00',
            width: '80%',
            height: '80%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <button
            onClick={() => setChatOpen(false)}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: '#ff0000',
              color: '#fff',
              border: 'none',
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: '1.5em',
              fontWeight: 'bold',
            }}
          >
            ×
          </button>
          <div style={{ flex: 1, padding: '10px', overflow: 'auto' }}>
            {chatMain}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrimNet;
