### [API 명세서](https://industrious-lasagna-717.notion.site/Node-js-API-fd72562f94f24d9cb4e50847729ad95a?pvs=4)
### [요구사항](https://teamsparta.notion.site/Node-js-18937b864baa453e9674dadee151e369)

### ERD 다이어그램
![user](https://github.com/KR-EGOIST/RDB-Game-Item-Simulator/assets/54177070/e223ab9c-c119-4445-9f2f-5bf54a1df95e)
![item](https://github.com/KR-EGOIST/RDB-Game-Item-Simulator/assets/54177070/af4e747f-41f7-4d3f-aba2-0667897e09ac)


### 1. **암호화 방식**
    - 비밀번호를 DB에 저장할 때 Hash를 이용했는데, Hash는 단방향 암호화와 양방향 암호화 중 어떤 암호화 방식에 해당할까요?
    - 비밀번호를 그냥 저장하지 않고 Hash 한 값을 저장 했을 때의 좋은 점은 무엇인가요?
### 2. **인증 방식**
    - JWT(Json Web Token)을 이용해 인증 기능을 했는데, 만약 Access Token이 노출되었을 경우 발생할 수 있는 문제점은 무엇일까요?
    - 해당 문제점을 보완하기 위한 방법으로는 어떤 것이 있을까요?
### 3. **인증과 인가**
    - 인증과 인가가 무엇인지 각각 설명해 주세요.
    - 위 API 구현 명세에서 인증을 필요로 하는 API와 그렇지 않은 API의 차이가 뭐라고 생각하시나요?
    - 아이템 생성, 수정 API는 인증을 필요로 하지 않는다고 했지만 사실은 어느 API보다도 인증이 필요한 API입니다. 왜 그럴까요?
### 4. **Http Status Code**
    - 과제를 진행하면서 사용한 Http Status Code를 모두 나열하고, 각각이 의미하는 것과 어떤 상황에 사용했는지 작성해 주세요.
### 5. **게임 경제**
    - 현재는 간편한 구현을 위해 캐릭터 테이블에 money라는 게임 머니 컬럼만 추가하였습니다.
        - 이렇게 되었을 때 어떠한 단점이 있을 수 있을까요?
        - 이렇게 하지 않고 다르게 구현할 수 있는 방법은 어떤 것이 있을까요?
    - 아이템 구입 시에 가격을 클라이언트에서 입력하게 하면 어떠한 문제점이 있을 수 있을까요?
