
const https = require("https");
const { URL } = require("url");

exports.handler = async function(event, context) {
  const year = new Date().getFullYear(); // 현재 연도 자동 설정
  const serviceKey = "Odn5P4fvXa%2Fhed175UJOP2MxbRubv5HMTtXmg2D3Nr1emNh5fuVKfs3%2FCaqBt2D%2F9zu1J7w1KFOf9u%2BIsRkbOQ%3D%3D";

  const baseUrl = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";
  const queryParams = `?solYear=${year}&numOfRows=100&_type=json&ServiceKey=${serviceKey}`;
  const url = new URL(baseUrl + queryParams);

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const items = json.response.body.items.item;
          const result = Array.isArray(items)
            ? items.map(item => item.locdate.toString().replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"))
            : [items.locdate.toString().replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")];
          resolve({ statusCode: 200, body: JSON.stringify(result) });
        } catch (e) {
          resolve({ statusCode: 500, body: "Failed to parse response: " + e.message });
        }
      });
    }).on("error", (err) => {
      resolve({ statusCode: 500, body: "Request failed: " + err.message });
    });
  });
};
