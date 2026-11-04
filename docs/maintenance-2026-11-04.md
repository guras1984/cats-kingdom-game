# 2026-11-04 안정성 점검

손상된 스테이지 번호와 별 기록을 정리해 시작·지도 화면 오류를 방지합니다. 퍼즐판의 빈 영역은 키보드 초점에서 제외합니다.

기존 게임 규칙과 정상 저장 기록을 유지합니다.

## 재현 검사

Playwright와 Chromium이 준비된 환경에서 사이트를 로컬 서버로 띄운 뒤 실행합니다.

```sh
node tests/browser-regression.cjs
```

기본 주소는 `http://127.0.0.1:8000/`입니다. 다른 주소는 `TEST_URL`, 브라우저 실행 파일은 `BROWSER_EXECUTABLE`, Playwright 설치 경로는 `PLAYWRIGHT_MODULE`로 지정할 수 있습니다. GURAS1984game은 docs 폴더를 서버 루트로 사용합니다.

휴대폰 세로·가로, 태블릿, PC 크기에서 초기 로딩을 확인했습니다. 실제 iPhone·iPad·Galaxy의 기종별 장시간 플레이까지 보증하는 검사는 아닙니다.
