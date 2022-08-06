import axios from 'axios';

const authenticateWithAuth0 = async () => {
  try {
    const response = await axios.post('https://dev-7udhnrqd.us.auth0.com/oauth/token', {
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: process.env.AUTH0_API_URI,
      grant_type: 'client_credentials',
    });
    if (response.status === 200) {
      return response.data.access_token;
    }
    return false;
  } catch (error) {
    console.log(error.response.data);
    return false;
  }
};

const callAuth0Api = async ({ method = 'GET', endpoint, data }) => {
  const token = await authenticateWithAuth0();
  if (token) {
    try {
      const response = await axios({
        method,
        url: `${process.env.AUTH0_API_URI}${endpoint}`,
        data,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.log(error.response.data);
      return false;
    }
  }
  return false;
};

export default callAuth0Api;
